require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Users = require('./models/usersModel');
const Countries = require('./models/countriesModel');
const Courses = require('./models/coursesModel');
const Session = require('./models/sessionModel');
const Assignment = require('./models/assignmentModel');
const Messages = require('./models/messagesModel');

/**
 * Seeds the public read-only demo account plus enough realistic data that
 * a recruiter landing in the app sees a populated product instead of a
 * set of empty tables.
 *
 * Safe to re-run: everything is keyed off stable demo emails/titles and
 * upserted, so running this twice won't duplicate rows.
 *
 * Usage:  node seedDemo.js
 */

// Credentials live in env so the password isn't hardcoded in several
// places. .env.example documents the defaults.
const DEMO_EMAIL = (process.env.DEMO_USER_EMAIL || 'demo@tafawooq.com').toLowerCase();
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Demo@1234';

const DEMO_TUTORS = [
    {
        email: 'demo.tutor.ayesha@tafawooq.com',
        first_name: 'Ayesha',
        last_name: 'Khan',
        description:
            'Cambridge-trained mathematics tutor with a decade of A-Level and IGCSE experience. I focus on building intuition first and drilling past papers second.',
        experience: 10,
        hourlyRate: 35,
        specializations: ['Mathematics', 'Further Maths', 'Physics']
    },
    {
        email: 'demo.tutor.omar@tafawooq.com',
        first_name: 'Omar',
        last_name: 'Siddiqui',
        description:
            'Software engineer turned CS teacher. I teach programming the way it is actually practised — small projects, real debugging, no memorising syntax tables.',
        experience: 7,
        hourlyRate: 40,
        specializations: ['Computer Science', 'Python', 'Web Development']
    }
];

// A neutral, always-available placeholder host so the image/video URL
// validators on the course schemas pass without depending on Cloudinary
// being configured.
const IMG = (seed) => `https://picsum.photos/seed/${seed}/800/450`;
const VID = (slug) => `https://videos.tafawooq-demo.com/${slug}.mp4`;

const DEMO_COURSES = [
    {
        tutor: 0,
        courseTitle: 'A-Level Mathematics: Pure Core 1 & 2',
        education_level: 'HIGHER',
        price: 89,
        desc: 'Complete coverage of Pure Core 1 and 2 with worked past-paper walkthroughs and exam technique.',
        about:
            'Built for students sitting A-Level Pure Maths who want more than formula recall. Every topic starts from where the idea comes from, then moves to the exam-board method.',
        description:
            'Twelve hours of teaching across algebra, coordinate geometry, sequences, differentiation and integration. Each section closes with a timed past-paper set and a full mark-scheme breakdown.',
        content: [
            {
                title: 'Algebra and Functions',
                topics: ['Surds and indices', 'Quadratic functions and the discriminant', 'Polynomial division', 'Graph transformations']
            },
            {
                title: 'Coordinate Geometry',
                topics: ['Straight lines and gradients', 'Circles and their equations', 'Intersections and tangents']
            },
            {
                title: 'Calculus Foundations',
                topics: ['Differentiation from first principles', 'Stationary points', 'Definite and indefinite integration', 'Area under a curve']
            }
        ]
    },
    {
        tutor: 0,
        courseTitle: 'IGCSE Mathematics: Full Syllabus Revision',
        education_level: 'SECONDARY',
        price: 59,
        desc: 'A complete IGCSE maths revision course covering number, algebra, geometry, trigonometry and statistics.',
        about:
            'A structured revision run designed for the final two terms before the exam, with topic tests that mirror the real paper weighting.',
        description:
            'Covers the full extended syllabus. Every module ends with a graded checkpoint so students can see which topics still need work before the mock.',
        content: [
            {
                title: 'Number and Algebra',
                topics: ['Fractions, ratio and percentages', 'Linear and simultaneous equations', 'Inequalities and number lines']
            },
            {
                title: 'Geometry and Trigonometry',
                topics: ['Angle rules and polygons', 'Pythagoras and SOHCAHTOA', 'Circle theorems']
            },
            {
                title: 'Statistics and Probability',
                topics: ['Averages from grouped data', 'Cumulative frequency', 'Tree diagrams']
            }
        ]
    },
    {
        tutor: 1,
        courseTitle: 'Python Programming from Absolute Zero',
        education_level: 'HIGHER',
        price: 75,
        desc: 'Learn Python by building four small programs, with no prior coding experience assumed.',
        about:
            'No computer-science background needed. We write real code from lesson one and read error messages properly instead of guessing.',
        description:
            'Starts at variables and ends with a working command-line app that reads and writes files. Emphasis throughout is on debugging skill, not syntax memorisation.',
        content: [
            {
                title: 'Getting Started',
                topics: ['Installing Python and your first script', 'Variables and data types', 'Reading error messages without panic']
            },
            {
                title: 'Control Flow',
                topics: ['Conditionals and truthiness', 'Loops and iteration patterns', 'Functions and scope']
            },
            {
                title: 'Working with Data',
                topics: ['Lists, dicts and when to use which', 'Reading and writing files', 'Building a small CLI project']
            }
        ]
    },
    {
        tutor: 1,
        courseTitle: 'Web Development Fundamentals: HTML, CSS & JavaScript',
        education_level: 'HIGHER',
        price: 95,
        desc: 'Build and ship a responsive multi-page website using only vanilla HTML, CSS and JavaScript.',
        about:
            'A frameworks-come-later course. Understand the platform properly and React will make far more sense when you reach it.',
        description:
            'Covers semantic markup, modern CSS layout with flexbox and grid, DOM manipulation and fetch. Finishes with a deployed portfolio site.',
        content: [
            {
                title: 'Structure and Semantics',
                topics: ['Semantic HTML and accessibility basics', 'Forms and validation', 'Images and responsive media']
            },
            {
                title: 'Modern CSS Layout',
                topics: ['Flexbox in practice', 'CSS Grid for page layout', 'Media queries and mobile-first design']
            },
            {
                title: 'JavaScript in the Browser',
                topics: ['Selecting and updating the DOM', 'Events and user input', 'Fetching data from an API']
            }
        ]
    },
    {
        tutor: 0,
        courseTitle: 'AS-Level Physics: Mechanics and Materials',
        education_level: 'HIGHER',
        price: 79,
        desc: 'Mechanics, materials and waves taught through worked problems and practical reasoning.',
        about:
            'Physics marks are lost on method, not knowledge. This course drills the structure examiners want to see in long-answer questions.',
        description:
            'Covers kinematics, forces, energy, materials and wave behaviour, with a full section on handling uncertainty in required practicals.',
        content: [
            {
                title: 'Mechanics',
                topics: ['Kinematics and motion graphs', 'Newton\u2019s laws in problem-solving', 'Momentum and collisions']
            },
            {
                title: 'Materials',
                topics: ['Stress, strain and Young modulus', 'Hooke\u2019s law and elastic energy']
            },
            {
                title: 'Waves',
                topics: ['Wave properties and superposition', 'Stationary waves and harmonics', 'Refraction and total internal reflection']
            }
        ]
    },
    {
        tutor: 1,
        courseTitle: 'Introduction to Databases and SQL',
        education_level: 'PROFESSIONAL',
        price: 69,
        desc: 'Relational modelling and practical SQL querying for developers and analysts.',
        about:
            'For anyone who can write a bit of code but freezes when handed a database. We model a real schema, then query it hard.',
        description:
            'Covers normalisation, joins, aggregation, indexing and transactions, all against a sample e-commerce dataset you can query along with.',
        content: [
            {
                title: 'Relational Modelling',
                topics: ['Tables, keys and relationships', 'Normalisation without the jargon']
            },
            {
                title: 'Querying with SQL',
                topics: ['SELECT, WHERE and ORDER BY', 'Joins that actually make sense', 'GROUP BY and aggregation']
            },
            {
                title: 'Going to Production',
                topics: ['Indexes and query plans', 'Transactions and isolation']
            }
        ]
    }
];

const upsertUser = async ({ email, first_name, last_name, role, country_id, passwordHash, teacherProfile }) => {
    const existing = await Users.findOne({ email });

    const payload = {
        email,
        first_name,
        last_name,
        role,
        country_id,
        password_hash: passwordHash,
        // Demo accounts bypass the OTP flow by being pre-verified. The real
        // registration path (Resend OTP + email verification) is untouched
        // — this only affects these seeded rows.
        isVerified: true,
        profile_pic: null
    };

    if (teacherProfile) payload.teacherProfile = teacherProfile;

    if (existing) {
        Object.assign(existing, payload);
        await existing.save();

        return existing;
    }

    return Users.create(payload);
};

const seedDemo = async () => {
    try {
        if (!process.env.DATABASE) {
            throw new Error('DATABASE env var is not set.');
        }

        await mongoose.connect(process.env.DATABASE);
        console.log('✅ Connected to MongoDB');

        // --- Country (courses and users both require one) -----------------
        let country = await Countries.findOne({ code: 'PK' });

        if (!country) country = await Countries.findOne();

        if (!country) {
            throw new Error('No countries found. Run `node seed.js` first to seed countries.');
        }

        console.log(`🌍 Using country: ${country.name}`);

        // --- Users --------------------------------------------------------
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

        const demoStudent = await upsertUser({
            email: DEMO_EMAIL,
            first_name: 'Demo',
            last_name: 'Student',
            role: 'student',
            country_id: country._id,
            passwordHash
        });

        console.log(`👤 Demo student ready: ${demoStudent.email}`);

        const tutors = [];

        for (const t of DEMO_TUTORS) {
            const tutor = await upsertUser({
                email: t.email,
                first_name: t.first_name,
                last_name: t.last_name,
                role: 'tutor',
                country_id: country._id,
                passwordHash,
                teacherProfile: {
                    description: t.description,
                    experience: t.experience,
                    hourlyRate: t.hourlyRate,
                    specializations: t.specializations,
                    education: [
                        { degree: 'MSc Education', institution: 'University of Manchester', year: 2016 }
                    ],
                    certifications: ['QTS', 'Advanced Subject Pedagogy']
                }
            });

            tutors.push(tutor);
            console.log(`🎓 Demo tutor ready: ${tutor.email}`);
        }

        // --- Courses ------------------------------------------------------
        const courses = [];

        for (const [i, c] of DEMO_COURSES.entries()) {
            const tutor = tutors[c.tutor];

            const courseDoc = {
                user_id: tutor._id,
                country_id: country._id,
                education_level: c.education_level,
                image: IMG(`tafawooq-course-${i + 1}`),
                courseTitle: c.courseTitle,
                desc: c.desc,
                price: c.price,
                courseDetails: {
                    title: c.courseTitle,
                    about: c.about,
                    description: c.description,
                    content: c.content.map(section => ({
                        title: section.title,
                        topics: section.topics.map(topicTitle => ({
                            title: topicTitle,
                            video: VID(topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
                        }))
                    }))
                },
                totalViews: 40 + i * 17,
                totalPurchases: 0
            };

            const existing = await Courses.findOne({ courseTitle: c.courseTitle, user_id: tutor._id });

            let course;

            if (existing) {
                Object.assign(existing, courseDoc);
                course = await existing.save();
            } else {
                course = await Courses.create(courseDoc);
            }

            courses.push(course);
            console.log(`  📚 Course: ${course.courseTitle}`);
        }

        // --- Enrolments (demo student owns the first four) ----------------
        const enrolled = courses.slice(0, 4);

        for (const course of enrolled) {
            const already = (course.purchases || []).some(
                p => p.user_id?.toString() === demoStudent._id.toString()
            );

            if (!already) {
                course.purchases.push({ user_id: demoStudent._id, timestamp: new Date() });
                course.totalPurchases = course.purchases.length;
                await course.save();
            }
        }

        demoStudent.purchasedCourses = enrolled.map(c => c._id);
        await demoStudent.save();
        console.log(`🛒 Enrolled demo student in ${enrolled.length} courses`);

        // --- Sessions -----------------------------------------------------
        // insertMany skips the pre('save') "date cannot be in the past"
        // hook, which is what lets us seed realistic completed history
        // alongside upcoming bookings.
        await Session.deleteMany({ studentId: demoStudent._id });

        const day = 24 * 60 * 60 * 1000;
        const now = Date.now();

        const sessionSeed = [
            { offset: -21 * day, status: 'completed', course: 'A-Level Mathematics: Pure Core 1 & 2', tutor: 0, notes: 'Covered differentiation from first principles. Strong grasp; set past-paper Q4-Q7 as follow-up.' },
            { offset: -14 * day, status: 'completed', course: 'A-Level Mathematics: Pure Core 1 & 2', tutor: 0, notes: 'Worked through stationary points. Needs more practice identifying points of inflection.' },
            { offset: -10 * day, status: 'completed', course: 'Python Programming from Absolute Zero', tutor: 1, notes: 'Built the file-reader project end to end. Debugging confidence noticeably improved.' },
            { offset: -6 * day, status: 'completed', course: 'AS-Level Physics: Mechanics and Materials', tutor: 0, notes: 'Momentum and collisions. Method marks were the weak point, not the physics.' },
            { offset: -3 * day, status: 'cancelled', course: 'Web Development Fundamentals: HTML, CSS & JavaScript', tutor: 1, reason: 'Student unwell — rescheduled to next week.' },
            { offset: 2 * day, status: 'approved', course: 'Python Programming from Absolute Zero', tutor: 1, message: 'Can we go over list comprehensions and dict methods please?' },
            { offset: 4 * day, status: 'approved', course: 'A-Level Mathematics: Pure Core 1 & 2', tutor: 0, message: 'Integration by substitution — I keep losing the constant.' },
            { offset: 9 * day, status: 'pending', course: 'Web Development Fundamentals: HTML, CSS & JavaScript', tutor: 1, message: 'Would like to focus on CSS Grid and responsive breakpoints.' }
        ];

        const sessionDocs = sessionSeed.map(s => ({
            teacherId: tutors[s.tutor]._id,
            studentId: demoStudent._id,
            date: new Date(now + s.offset),
            duration: 60,
            price: tutors[s.tutor].teacherProfile?.hourlyRate || 35,
            courseName: s.course,
            status: s.status,
            message: s.message,
            notes: s.notes,
            cancellationReason: s.reason,
            meetingLink: s.status === 'approved' ? 'https://meet.jit.si/tafawooq-demo-session' : undefined
        }));

        await Session.insertMany(sessionDocs);
        console.log(`📅 Seeded ${sessionDocs.length} sessions`);

        // --- Assignments --------------------------------------------------
        await Assignment.deleteMany({ course_id: { $in: courses.map(c => c._id) } });

        const assignmentSeed = [
            { courseIdx: 0, title: 'Past Paper 1: Algebra and Functions', dueOffset: -7 * day },
            { courseIdx: 0, title: 'Differentiation Problem Set A', dueOffset: 3 * day },
            { courseIdx: 0, title: 'Coordinate Geometry Checkpoint', dueOffset: 10 * day },
            { courseIdx: 1, title: 'Circle Theorems Worksheet', dueOffset: -2 * day },
            { courseIdx: 1, title: 'Cumulative Frequency Practice', dueOffset: 5 * day },
            { courseIdx: 2, title: 'Project 1: Number Guessing Game', dueOffset: -4 * day },
            { courseIdx: 2, title: 'Project 2: File-Based To-Do CLI', dueOffset: 6 * day },
            { courseIdx: 2, title: 'Debugging Exercise: Fix the Broken Loop', dueOffset: 12 * day },
            { courseIdx: 3, title: 'Build a Responsive Landing Page', dueOffset: 8 * day },
            { courseIdx: 3, title: 'Fetch and Render an API Response', dueOffset: 15 * day },
            { courseIdx: 4, title: 'Required Practical: Young Modulus Write-Up', dueOffset: 4 * day },
            { courseIdx: 5, title: 'SQL Joins Challenge Set', dueOffset: 7 * day }
        ];

        const assignmentDocs = assignmentSeed.map(a => ({
            course_id: courses[a.courseIdx]._id,
            title: a.title,
            dueDate: new Date(now + a.dueOffset),
            created_by: courses[a.courseIdx].user_id
        }));

        await Assignment.insertMany(assignmentDocs);
        console.log(`📝 Seeded ${assignmentDocs.length} assignments`);

        // --- Chat history -------------------------------------------------
        await Messages.deleteMany({
            $or: [{ sender: demoStudent._id }, { receiver: demoStudent._id }]
        });

        const hour = 60 * 60 * 1000;

        const conversation = [
            { from: 'student', tutor: 0, text: 'Hi Ayesha — I\u2019m stuck on question 7 from the integration set. Is the substitution u = 2x + 1?', ago: 52 * hour },
            { from: 'tutor', tutor: 0, text: 'Good instinct, that\u2019s the right substitution. Remember to change the limits too, not just the integrand.', ago: 51 * hour },
            { from: 'student', tutor: 0, text: 'That\u2019s exactly where I keep going wrong. Thank you!', ago: 50 * hour },
            { from: 'tutor', tutor: 0, text: 'Very common slip. Try Q8 with the same approach and send me a photo of your working.', ago: 49 * hour },
            { from: 'student', tutor: 0, text: 'Will do. Also, are we still on for Thursday?', ago: 26 * hour },
            { from: 'tutor', tutor: 0, text: 'Yes, Thursday 4pm as booked. I\u2019ll prepare a set on points of inflection.', ago: 25 * hour },
            { from: 'student', tutor: 1, text: 'Omar, my CLI project throws a KeyError when the file is empty. Any pointers?', ago: 30 * hour },
            { from: 'tutor', tutor: 1, text: 'Classic one. Check what your load function returns when the file has no contents — it\u2019s probably None rather than an empty dict.', ago: 29 * hour },
            { from: 'student', tutor: 1, text: 'That was it. Added a default and it works. Thanks!', ago: 28 * hour },
            { from: 'tutor', tutor: 1, text: 'Nicely spotted. Next session we\u2019ll look at handling that with try/except properly.', ago: 27 * hour },
            { from: 'student', tutor: 1, text: 'Sounds good. Could we also cover list comprehensions?', ago: 5 * hour },
            { from: 'tutor', tutor: 1, text: 'Absolutely — I\u2019ll build the next session around them.', ago: 4 * hour }
        ];

        const messageDocs = conversation.map(m => {
            const tutorId = tutors[m.tutor]._id;

            return {
                sender: m.from === 'student' ? demoStudent._id : tutorId,
                receiver: m.from === 'student' ? tutorId : demoStudent._id,
                content: m.text,
                read: m.ago > 6 * hour,
                timestamp: new Date(now - m.ago)
            };
        });

        await Messages.insertMany(messageDocs);
        console.log(`💬 Seeded ${messageDocs.length} chat messages`);

        // --- Summary ------------------------------------------------------
        const total =
            1 + tutors.length + courses.length + sessionDocs.length + assignmentDocs.length + messageDocs.length;

        console.log('\n🚀 Demo seeding complete');
        console.log(`   Users       : ${1 + tutors.length} (1 student, ${tutors.length} tutors)`);
        console.log(`   Courses     : ${courses.length} (${enrolled.length} enrolled)`);
        console.log(`   Sessions    : ${sessionDocs.length}`);
        console.log(`   Assignments : ${assignmentDocs.length}`);
        console.log(`   Messages    : ${messageDocs.length}`);
        console.log(`   ─────────────────────`);
        console.log(`   Total       : ${total} records\n`);
        console.log(`   Login with  : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
        console.log(`   (read-only — writes are blocked by middlewares/demoGuard.js)\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding demo data:', error.message);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
};

seedDemo();
