/**
 * Professional Assignment Formatting Guide
 * 
 * This utility provides helpful functions to format assignment content professionally
 * and a guide for AI models on how to structure high-quality content.
 */

/**
 * Template functions for professional HTML formatting
 */

export const formatProfessionalCode = (code, language = 'cpp') => {
    return `<pre class="code-block"><code class="language-${language}">${escapeHTML(code)}</code></pre>`;
};

export const formatTerminalOutput = (outputText) => {
    return `<div class="terminal-output">
  <div class="terminal-title">Program Run</div>
  <pre>${escapeHTML(outputText)}</pre>
</div>`;
};

export const formatProfessionalTable = (headers, rows) => {
    const headerHTML = headers.map(h => `<th>${h}</th>`).join('');
    const rowsHTML = rows
        .map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`)
        .join('');
    
    return `
<table class="solution-table">
  <thead><tr>${headerHTML}</tr></thead>
  <tbody>${rowsHTML}</tbody>
</table>`;
};

export const formatFormula = (formula) => {
    return `<code class="formula">${escapeHTML(formula)}</code>`;
};

export const formatDefinition = (term, definition) => {
    return `<div class="definition-box">
  <strong>${term}:</strong> ${definition}
</div>`;
};

export const formatKeyPoint = (text) => {
    return `<div class="key-point">
  <strong>Key Point:</strong> ${text}
</div>`;
};

export const formatWarning = (text) => {
    return `<div class="warning-box">
  <strong>⚠️ Common Mistake:</strong> ${text}
</div>`;
};

export const formatSolutionSteps = (steps) => {
    const stepsHTML = steps
        .map((step, idx) => `<div class="solution-step"><strong>Step ${idx + 1}:</strong> ${step}</div>`)
        .join('');
    
    return `<div class="solution-steps">${stepsHTML}</div>`;
};

export const formatSubquestion = (letter, content) => {
    return `<div class="subquestion">
  <span class="subquestion-letter">${letter}</span>
  ${content}
</div>`;
};

/**
 * Professional formatting guide for AI models
 */
export const PROFESSIONAL_FORMATTING_GUIDE = `
# Professional Assignment Formatting Guide

## 1. CODE BLOCKS
Use this for any code (C++, Python, Java, SQL, etc):
\`\`\`html
<pre class="code-block"><code class="language-cpp">
#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}
</code></pre>
\`\`\`

Supported languages: cpp, python, java, javascript, sql, html, css, bash, json

## 2. TABLES
Use for comparisons, data, properties:
\`\`\`html
<table class="solution-table">
  <thead>
    <tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr>
  </thead>
  <tbody>
    <tr><td>Data 1</td><td>Data 2</td><td>Data 3</td></tr>
    <tr><td>Data A</td><td>Data B</td><td>Data C</td></tr>
  </tbody>
</table>
\`\`\`

## 3. FORMULAS
Use for mathematical expressions:
\`\`\`html
<code class="formula">E = mc²</code>
<code class="formula">f(x) = 2x + 1</code>
<code class="formula">∑(x_i) from i=1 to n</code>
\`\`\`

## 4. DEFINITIONS
\`\`\`html
<div class="definition-box">
  <strong>Variable Name:</strong> Description of what this variable represents
</div>
\`\`\`

## 5. KEY POINTS (Important highlights):
\`\`\`html
<div class="key-point">
  <strong>Key Point:</strong> Important fact or concept to remember
</div>
\`\`\`

## 6. WARNINGS (Common mistakes):
\`\`\`html
<div class="warning-box">
  <strong>⚠️ Common Mistake:</strong> What students often get wrong
</div>
\`\`\`

## 7. SOLUTION STEPS
\`\`\`html
<div class="solution-steps">
  <div class="solution-step"><strong>Step 1:</strong> First step description</div>
  <div class="solution-step"><strong>Step 2:</strong> Second step description</div>
  <div class="solution-step"><strong>Step 3:</strong> Third step description</div>
</div>
\`\`\`

## 8. SUBQUESTIONS
\`\`\`html
<div class="subquestion">
  <span class="subquestion-letter">(a)</span>
  <p>Answer to part (a)</p>
</div>
<div class="subquestion">
  <span class="subquestion-letter">(b)</span>
  <p>Answer to part (b)</p>
</div>
\`\`\`

## 9. BASIC HTML STRUCTURE
\`\`\`html
<h2>Question 1: Question Title</h2>
<p>Introduction or question context</p>

<h3>Solution</h3>
<ol>
  <li>First point</li>
  <li>Second point</li>
  <li>Third point</li>
</ol>

<h3>Explanation</h3>
<p>Explanation of the solution and how it works</p>
\`\`\`

## 10. COMPLETE PROFESSIONAL EXAMPLE

\`\`\`html
<h2>Question 2: Implement a Student Class</h2>
<p>Create a C++ class representing a Student with the specified attributes.</p>

<h3>Requirements</h3>
<table class="solution-table">
  <thead>
    <tr><th>Attribute</th><th>Type</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>firstName</td><td>string</td><td>Student's first name</td></tr>
    <tr><td>lastName</td><td>string</td><td>Student's last name</td></tr>
    <tr><td>gpa</td><td>double</td><td>Student's GPA from 0.0 to 4.0</td></tr>
  </tbody>
</table>

<h3>Solution</h3>
<pre class="code-block"><code class="language-cpp">
#include <iostream>
#include <string>
using namespace std;

class Student {
private:
    string firstName;
    string lastName;
    double gpa;

public:
    Student(string fName, string lName, double studentGPA) {
        firstName = fName;
        lastName = lName;
        gpa = studentGPA;
    }
    
    string getFullName() {
        return firstName + " " + lastName;
    }
    
    void displayInfo() {
        cout << "Name: " << getFullName() << endl;
        cout << "GPA: " << gpa << endl;
    }
};
</code></pre>

<div class="key-point">
  <strong>Key Point:</strong> Use private members to encapsulate data and public methods to control access.
</div>

<h3>Explanation</h3>
<p>The solution demonstrates object-oriented principles:</p>
<ul>
  <li><strong>Encapsulation:</strong> Private data members protect internal state</li>
  <li><strong>Constructor:</strong> Initializes the object with provided values</li>
  <li><strong>Methods:</strong> Public functions provide controlled access to data</li>
</ul>

<div class="warning-box">
  <strong>⚠️ Common Mistake:</strong> Forgetting to initialize member variables in the constructor can lead to undefined behavior.
</div>
\`\`\`

## TIPS FOR WRITING PROFESSIONAL RESPONSES:

✅ DO:
- Use <h2> for main questions
- Use <h3> for sub-sections
- Always include code in <pre class="code-block">
- Put formulas in <code class="formula">
- Add a sample output block after every code block using <div class="terminal-output">
- Create tables for structured data
- Use definition boxes for terminology
- Highlight key points and common mistakes
- End paragraphs with proper sentences
- Use <strong> for emphasis, not CAPS

❌ DON'T:
- Use excessive markdown (* or **)
- Mix formatting styles
- Use plain text code without blocks
- Forget to close HTML tags
- Use random capitalization for emphasis
- Create poorly aligned tables
- Skip explanations of solutions
`;

/**
 * HTML escape utility
 */
const escapeHTML = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};

export default {
    formatProfessionalCode,
  formatTerminalOutput,
    formatProfessionalTable,
    formatFormula,
    formatDefinition,
    formatKeyPoint,
    formatWarning,
    formatSolutionSteps,
    formatSubquestion,
    PROFESSIONAL_FORMATTING_GUIDE
};
