import mongoose from "mongoose"

const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  
  googleCourseId : { 
    type: String, 
    required: true
  },
    name: { 
    type: String, 
    required: true, 
  },
    section: { 
    type: String, 
    required: false
  },
    descriptionHeading: { 
    type: String, 
    required: false,
  },
  room: { 
    type: String, 
    required: false, 
  },
    ownerId: { 
    type: String, 
    required: false, 
  },
    creationTime: { 
    type: String, 
    required: true, 
  },
    updateTime: { 
    type: String, 
    required: false, 
  },
    courseState: { 
    type: String, 
    required: true
  },
    alternateLink: { 
    type: String, 
    required: false, 
  },
    teacherGroupEmail: { 
    type: String, 
    required: false, 
  },
    courseGroupEmail: { 
    type: String, 
    required: false, 
  },
    guardiansEnabled: Boolean,
    calendarId: { 
    type: String, 
    required: false, 
  },
    gradebookSettings: {
      calculationType: { 
    type: String, 
    required: false,
  },
      displaySetting: { 
    type: String, 
    required: false,
  }
    }
})

const Course = mongoose.model('Course',courseSchema)
export default Course;