// Pre-loaded from user's uploaded PDF resume (Manoj Kumar PR)
export const DEFAULT_CV = {
  fullName: 'MANOJ KUMAR PR',
  headline: 'Software Development Engineer • Software Tester • Data Analyst',
  phone: '+91 7338041238',
  email: 'manojrmanu360@gmail.com',
  linkedin: 'linkedin.com/in/manoj-kumar-pr',
  github: 'github.com/Manoj123-ops',
  location: 'Shivamogga / Bengaluru, Karnataka, India',
  summary:
    'Information Science and Engineering graduate who enjoys turning ideas into working software, from clean data pipelines to full-stack applications. Comfortable working across the stack, with hands-on experience in Python, SQL, machine learning, and modern web development, gained through academic projects and a live industry internship. A fast learner who has recently broadened into cybersecurity, React.js, and full-stack development through additional certification, and enjoys picking up new tools and domains quickly. Looking for an entry-level opportunity in software development, testing, or data analytics to keep building and growing.',
  education: [
    {
      degree: 'Bachelor of Engineering, Information Science & Engineering',
      institution: 'Jawaharlal Nehru National College of Engineering, Shivamogga',
      period: '2023 - 2026',
      score: 'CGPA: 7.56',
    },
    {
      degree: 'Diploma in Information Science & Engineering',
      institution: 'D.S. Dinakar National Polytechnic, Shivamogga',
      period: '2022',
      score: '56.77%',
    },
    {
      degree: 'SSLC',
      institution: 'SKN English Medium School, Shivamogga',
      period: '2017',
      score: '80.00%',
    },
  ],
  skills: [
    {
      category: 'Programming Languages',
      items: 'Python, Java, C, SQL',
    },
    {
      category: 'Libraries & Frameworks',
      items: 'Pandas, NumPy, scikit-learn, TensorFlow/Keras, React.js',
    },
    {
      category: 'Data Analytics',
      items: 'Data Cleaning, Data Transformation, Exploratory Data Analysis (EDA), Data Visualization, Tableau',
    },
    {
      category: 'Machine Learning',
      items: 'Random Forest, Artificial Neural Networks (ANN), LSTM, Ensemble Modeling, Weighted Voting Ensemble',
    },
    {
      category: 'Web Development',
      items: 'HTML, CSS, JavaScript, React.js, MySQL',
    },
    {
      category: 'Core CS & Testing Tools',
      items: 'OOP, Data Structures & Algorithms, DBMS, SDLC, Git, Visual Studio, Eclipse, Manual Testing',
    },
    {
      category: 'Networking & Security',
      items: 'OSI Reference Model, TCP/IP Protocol Suite, Subnetting, DNS, HTTP/HTTPS, Network Security Fundamentals',
    },
  ],
  experience: [
    {
      title: 'Python and Data Analytics Intern',
      company: 'Dyashin Technosoft Pvt. Ltd., Bengaluru',
      period: 'Feb 2026 - May 2026',
      bullets: [
        'Cleaned, transformed, and preprocessed real-world datasets using Python and Pandas, preparing them for reliable downstream analysis and reporting.',
        'Conducted exploratory data analysis and built visualizations to surface patterns, translating raw data into clear, decision-ready summary reports.',
        'Applied structured problem-solving across multiple analytics case studies, moving from open-ended datasets to actionable conclusions.',
      ],
    },
    {
      title: 'Virtual Internship Program',
      company: 'VTU Centre for Online Education',
      period: 'Apr 2026',
      bullets: [
        'Completed a multi-track virtual internship program covering Python, Cybersecurity, React.js, and Full Stack Development, earning Elite Gold certification worth 12 credits.',
        'Built practical, cross-domain exposure spanning secure coding fundamentals, frontend development with React.js, and end-to-end full-stack application concepts.',
      ],
    },
  ],
  projects: [
    {
      title: 'Diabetes Mellitus Prediction Using Machine Learning',
      tech: 'Python, scikit-learn, TensorFlow/Keras, Random Forest, ANN, LSTM',
      bullets: [
        'Developed a machine learning pipeline using Python, scikit-learn, and TensorFlow/Keras to predict diabetes risk from patient health data.',
        'Implemented and compared Random Forest, Artificial Neural Network (ANN), and LSTM classification models for diabetes prediction.',
        'Combined multiple classifiers using a Weighted Voting Ensemble approach to improve prediction stability and model performance.',
        'Achieved 83% accuracy with the ensemble model and evaluated performance using accuracy and ROC-AUC metrics.',
      ],
    },
    {
      title: 'Library Management System',
      tech: 'HTML, CSS, JavaScript, MySQL',
      bullets: [
        'Designed and developed a web-based Library Management System for managing books, members, and issue/return records.',
        'Built the frontend using HTML, CSS, and JavaScript, and integrated a MySQL database for persistent data storage and retrieval.',
        'Implemented core workflows including book search, member registration, book issue, book return, and record tracking to support common library operations.',
        'Applied database management and web development concepts to create a structured, database-backed application.',
      ],
    },
  ],
  certifications: [
    'Software Testing - NPTEL (IIT Bangalore)',
    'Python, Cybersecurity, React.js & Full Stack Development - Virtual Internship Program, VTU Centre for Online Education (Elite Gold, 12 Credits)',
    'Internship Completion Certificate - Python and Data Analytics, Dyashin Technosoft Pvt. Ltd., Bengaluru',
  ],
};

export function cvToPlainText(cv) {
  const lines = [];
  lines.push(cv.fullName);
  lines.push(cv.headline);
  lines.push(`${cv.phone} | ${cv.email} | ${cv.linkedin} | ${cv.github}`);
  lines.push('');
  lines.push('PROFESSIONAL SUMMARY');
  lines.push(cv.summary);
  lines.push('');
  lines.push('EDUCATION');
  (cv.education || []).forEach((edu) => {
    lines.push(`${edu.degree} (${edu.period})`);
    lines.push(`${edu.institution} | ${edu.score}`);
  });
  lines.push('');
  lines.push('TECHNICAL SKILLS');
  (cv.skills || []).forEach((s) => {
    lines.push(`${s.category}: ${s.items}`);
  });
  lines.push('');
  lines.push('INTERNSHIP EXPERIENCE');
  (cv.experience || []).forEach((exp) => {
    lines.push(`${exp.title} - ${exp.company} (${exp.period})`);
    (exp.bullets || []).forEach((b) => lines.push(`• ${b}`));
  });
  lines.push('');
  lines.push('PROJECTS');
  (cv.projects || []).forEach((proj) => {
    lines.push(`${proj.title}${proj.tech ? ` [${proj.tech}]` : ''}`);
    (proj.bullets || []).forEach((b) => lines.push(`• ${b}`));
  });
  lines.push('');
  lines.push('CERTIFICATIONS');
  (cv.certifications || []).forEach((c) => lines.push(`• ${c}`));
  return lines.join('\n');
}
