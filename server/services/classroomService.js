import { google } from 'googleapis';
import Assignment from '../models/Assignment.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

export const scanClassroomService = async (userId) => {

  const user = await User.findById(userId);
  if (!user || !user.refreshToken) {
    throw new Error('User not found or no refresh token available');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: user.refreshToken });

  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

  // Initialize counters
  let stats = {
    submitted: 0,
    missing: 0,
    assigned: 0,
    total: 0
  };

  // 1. Fetch & Store Courses
  const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
  const courses = coursesRes.data.courses || [];

  for (const course of courses) {
    // Upsert Course Info
    await Course.findOneAndUpdate(
      { userId: userId, googleCourseId: course.id },
      {
        userId: userId,
        googleCourseId: course.id,
        name: course.name,
        section: course.section,
        descriptionHeading: course.descriptionHeading,
        room: course.room,
        alternateLink: course.alternateLink,
        courseState: course.courseState,
      },
      { upsert: true, new: true }
    );

    // 2. Fetch Assignments & Submissions
    let nextPageToken = undefined;

    do {
      const workRes = await classroom.courses.courseWork.list({
        courseId: course.id,
        orderBy: 'updateTime desc',
        pageSize: 50,
        pageToken: nextPageToken
      });

      const assignments = workRes.data.courseWork || [];
      nextPageToken = workRes.data.nextPageToken;

      for (const work of assignments) {

        // --- NEW LOGIC: Fetch Submission Status ---
        // We must fetch the submission to know if it's turned in or missing
        let status = 'assigned'; // Default

        try {
          const submissionRes = await classroom.courses.courseWork.studentSubmissions.list({
            courseId: course.id,
            courseWorkId: work.id,
            userId: 'me' // 'me' refers to the authenticated user
          });

          const submission = submissionRes.data.studentSubmissions ? submissionRes.data.studentSubmissions[0] : null;

          if (submission) {
            const state = submission.state; // NEW, CREATED, TURNED_IN, RETURNED, RECLAIMED_BY_STUDENT

            if (state === 'TURNED_IN' || state === 'RETURNED') {
              status = 'submitted';
            } else {
              // Check for Missing (Not turned in + Past Due Date)
              if (work.dueDate) {
                const due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
                if (work.dueTime) {
                  due.setHours(work.dueTime.hours || 0, work.dueTime.minutes || 0, 0);
                } else {
                  due.setHours(23, 59, 59); // Default to end of day
                }

                if (due < new Date()) {
                  status = 'missing';
                }
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch submission for work ${work.id}:`, err.message);
        }

        // Update counters
        stats[status]++;
        stats.total++;

        // --- Database Update ---
        // We use findOneAndUpdate to ensure status is updated even if assignment exists
        await Assignment.findOneAndUpdate(
          {
            userId: user._id,
            googleClassroomAssignmentId: work.id
          },
          {
            userId: user._id,
            googleClassroomAssignmentId: work.id,
            courseId: course.id,
            courseName: course.name,
            title: work.title,
            description: work.description,
            dueDate: work.dueDate ? new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day) : null,
            alternateLink: work.alternateLink,
            materials: work.materials,
            status: status // <--- Saving the calculated status
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    } while (nextPageToken);
  }

  return { success: true, stats };
};
