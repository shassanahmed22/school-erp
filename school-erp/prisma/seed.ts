import "dotenv/config"; // tsx does not auto-load .env like Next.js does — load it explicitly
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = [
  { name: "Super Admin", slug: "super-admin", isSystem: true, description: "Full system access" },
  { name: "Principal", slug: "principal", isSystem: true, description: "School principal" },
  { name: "Vice Principal", slug: "vice-principal", isSystem: true, description: "Vice principal" },
  { name: "Admin Staff", slug: "admin-staff", isSystem: true, description: "Administrative staff" },
  { name: "Teacher", slug: "teacher", isSystem: true, description: "Teaching staff" },
  { name: "Accountant", slug: "accountant", isSystem: true, description: "Finance & accounts" },
  { name: "Student", slug: "student", isSystem: true, description: "Student portal access" },
  { name: "Parent", slug: "parent", isSystem: true, description: "Parent portal access" },
  { name: "Receptionist", slug: "receptionist", isSystem: true, description: "Front desk staff" },
  { name: "Librarian", slug: "librarian", isSystem: true, description: "Library staff" },
  { name: "HR Manager", slug: "hr-manager", isSystem: true, description: "Human resources & payroll management" },
  { name: "Transport Manager", slug: "transport-manager", isSystem: true, description: "Transport & fleet management" },
  { name: "Inventory Manager", slug: "inventory-manager", isSystem: true, description: "Store & inventory management" },
];

// Foundation-layer permissions. Future modules append to this list.
const PERMISSION_MODULES: Record<string, string[]> = {
  users: ["create", "edit", "delete", "view"],
  roles: ["create", "edit", "delete", "view"],
  permissions: ["create", "edit", "delete", "view", "assign"],
  settings: ["manage", "view"],
  "audit-logs": ["view"],
  "activity-logs": ["view"],
  reports: ["view"],
  dashboard: ["view"],
  // Part 2 — Core Academic Management Layer
  students: ["create", "edit", "delete", "view"],
  teachers: ["create", "edit", "delete", "view"],
  classes: ["create", "edit", "delete", "view"],
  sections: ["create", "edit", "delete", "view"],
  subjects: ["create", "edit", "delete", "view"],
  "academic-years": ["create", "edit", "delete", "view"],
  enrollments: ["create", "edit", "view"],
  // Part 3 — Attendance + Examination + Results Management Layer
  attendance: ["create", "edit", "delete", "view"],
  exams: ["create", "edit", "delete", "view"],
  results: ["create", "edit", "view"],
  // Part 4A — Fees & Finance Management Module
  "fee-categories": ["create", "edit", "delete", "view"],
  "fee-structures": ["create", "edit", "delete", "view"],
  "student-fees": ["create", "edit", "delete", "view"],
  "fee-payments": ["create", "view"],
  scholarships: ["create", "edit", "delete", "view"],
  // Part 4B — HR & Staff Management
  departments: ["create", "edit", "delete", "view"],
  employees: ["create", "edit", "delete", "view"],
  payroll: ["create", "edit", "delete", "view"],
  books: ["create", "edit", "delete", "view"],
  transport: ["create", "edit", "delete", "view"],
  // Part 5 — Inventory & Messaging
  "inventory-categories": ["create", "edit", "delete", "view"],
  "inventory-items": ["create", "edit", "delete", "view"],
  "inventory-transactions": ["create", "view"],
  messages: ["create", "view", "delete"],
  announcements: ["create", "edit", "delete", "view"],
  timetable: ["create", "edit", "delete", "view"],
  assignments: ["create", "edit", "delete", "view", "grade"],
  events: ["create", "edit", "delete", "view"],
};

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr", isDefault: true },
  { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl", isDefault: false },
];

const SETTINGS = [
  { key: "school.name", value: "Bright Future School", group: "school", type: "string" },
  { key: "school.logo", value: "", group: "school", type: "string" },
  { key: "school.address", value: "", group: "school", type: "string" },
  { key: "school.phone", value: "", group: "school", type: "string" },
  { key: "school.email", value: "", group: "school", type: "string" },
  { key: "system.default_language", value: "en", group: "system", type: "string" },
  { key: "system.default_theme", value: "light", group: "system", type: "string" },
  { key: "system.timezone", value: "Asia/Karachi", group: "system", type: "string" },
  { key: "system.date_format", value: "DD/MM/YYYY", group: "system", type: "string" },
];

async function main() {
  console.log("🌱 Seeding foundation data...");

  // Permissions
  const permissionRecords = Object.entries(PERMISSION_MODULES).flatMap(([module, actions]) =>
    actions.map((action) => ({
      name: `${module}.${action}`,
      module,
      action,
      description: `Allows ${action} on ${module}`,
    }))
  );

  for (const perm of permissionRecords) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(`✔ Seeded ${permissionRecords.length} permissions`);

  // Roles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {},
      create: role,
    });
  }
  console.log(`✔ Seeded ${ROLES.length} roles`);

  // Super Admin gets ALL permissions
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "super-admin" } });
  const allPermissions = await prisma.permission.findMany();

  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }
  console.log(`✔ Granted all permissions to Super Admin`);

  // Sensible default grants for other built-in roles (super-admin already has everything)
  const ROLE_PERMISSION_DEFAULTS: Record<string, string[]> = {
    principal: [
      "dashboard.view", "students.view", "students.edit", "teachers.view", "teachers.edit",
      "classes.view", "classes.create", "classes.edit", "sections.view", "sections.create", "sections.edit",
      "subjects.view", "subjects.create", "subjects.edit", "academic-years.view", "academic-years.create",
      "academic-years.edit", "enrollments.view", "enrollments.create", "enrollments.edit",
      "timetable.view", "timetable.create", "timetable.edit", "timetable.delete",
      "assignments.view", "assignments.create", "assignments.edit", "assignments.delete", "assignments.grade",
      "attendance.view", "attendance.create", "attendance.edit", "attendance.delete",
      "exams.view", "exams.create", "exams.edit", "exams.delete",
      "results.view", "results.create", "results.edit",
      "fee-categories.view", "fee-categories.create", "fee-categories.edit",
      "fee-structures.view", "fee-structures.create", "fee-structures.edit",
      "student-fees.view", "student-fees.create", "student-fees.edit",
      "fee-payments.view", "fee-payments.create",
      "scholarships.view", "scholarships.create", "scholarships.edit",
      "departments.view", "departments.create", "departments.edit",
      "employees.view", "employees.create", "employees.edit",
      "payroll.view", "payroll.create", "payroll.edit",
      "books.view", "books.create", "books.edit",
      "transport.view", "transport.create", "transport.edit",
      "inventory-categories.view", "inventory-categories.create", "inventory-categories.edit",
      "inventory-items.view", "inventory-items.create", "inventory-items.edit",
      "inventory-transactions.view", "inventory-transactions.create",
      "announcements.view", "announcements.create", "announcements.edit", "announcements.delete",
      "events.view", "events.create", "events.edit", "events.delete",
      "messages.view", "messages.create", "messages.delete",
      "reports.view", "audit-logs.view", "activity-logs.view", "settings.view", "settings.manage",
    ],
    "vice-principal": [
      "dashboard.view", "students.view", "students.edit", "teachers.view",
      "classes.view", "sections.view", "subjects.view", "academic-years.view",
      "enrollments.view", "enrollments.create",
      "timetable.view", "timetable.create", "timetable.edit",
      "assignments.view", "assignments.create", "assignments.edit", "assignments.grade",
      "attendance.view", "attendance.edit", "exams.view", "exams.edit", "results.view", "results.edit",
      "fee-structures.view", "student-fees.view", "fee-payments.view", "scholarships.view",
      "announcements.view", "announcements.create",
      "events.view", "events.create", "events.edit",
      "messages.view", "messages.create", "messages.delete",
      "reports.view", "activity-logs.view",
    ],
    "admin-staff": [
      "dashboard.view", "students.view", "students.create", "students.edit",
      "teachers.view", "teachers.create", "teachers.edit",
      "classes.view", "sections.view", "subjects.view", "academic-years.view",
      "enrollments.view", "enrollments.create",
      "timetable.view", "timetable.create", "timetable.edit",
      "assignments.view",
      "attendance.view", "exams.view", "results.view",
      "fee-structures.view", "student-fees.view", "fee-payments.view",
      "inventory-categories.view", "inventory-categories.create", "inventory-categories.edit",
      "inventory-items.view", "inventory-items.create", "inventory-items.edit",
      "inventory-transactions.view", "inventory-transactions.create",
      "announcements.view", "announcements.create",
      "events.view", "events.create", "events.edit",
      "messages.view", "messages.create", "messages.delete",
      "activity-logs.view",
    ],
    teacher: [
      "dashboard.view", "students.view", "classes.view", "sections.view", "subjects.view",
      "timetable.view",
      "assignments.view", "assignments.create", "assignments.edit", "assignments.delete", "assignments.grade",
      "attendance.view", "attendance.create", "attendance.edit",
      "exams.view", "results.view", "results.create",
      "student-fees.view",
      "announcements.view",
      "events.view",
      "messages.view", "messages.create", "messages.delete",
    ],
    accountant: [
      "dashboard.view", "students.view", "classes.view",
      "fee-categories.view", "fee-categories.create", "fee-categories.edit", "fee-categories.delete",
      "fee-structures.view", "fee-structures.create", "fee-structures.edit", "fee-structures.delete",
      "student-fees.view", "student-fees.create", "student-fees.edit", "student-fees.delete",
      "fee-payments.view", "fee-payments.create",
      "scholarships.view", "scholarships.create", "scholarships.edit", "scholarships.delete",
      "announcements.view",
      "events.view",
      "messages.view", "messages.create", "messages.delete",
      "reports.view",
    ],
    receptionist: [
      "dashboard.view", "students.view", "students.create", "teachers.view", "classes.view", "student-fees.view",
      "announcements.view", "events.view", "messages.view", "messages.create", "messages.delete",
    ],
    librarian: [
      "dashboard.view", "students.view", "classes.view", "books.view", "books.create", "books.edit", "books.delete",
      "announcements.view", "events.view", "messages.view", "messages.create", "messages.delete",
    ],
    "hr-manager": [
      "dashboard.view", "departments.view", "departments.create", "departments.edit", "departments.delete",
      "employees.view", "employees.create", "employees.edit", "employees.delete",
      "payroll.view", "payroll.create", "payroll.edit", "payroll.delete",
      "announcements.view", "announcements.create",
      "events.view", "events.create", "events.edit",
      "messages.view", "messages.create", "messages.delete",
      "reports.view", "activity-logs.view",
    ],
    "transport-manager": [
      "dashboard.view", "students.view", "transport.view", "transport.create", "transport.edit", "transport.delete",
      "announcements.view", "events.view", "messages.view", "messages.create", "messages.delete",
    ],
    "inventory-manager": [
      "dashboard.view",
      "inventory-categories.view", "inventory-categories.create", "inventory-categories.edit", "inventory-categories.delete",
      "inventory-items.view", "inventory-items.create", "inventory-items.edit", "inventory-items.delete",
      "inventory-transactions.view", "inventory-transactions.create",
      "announcements.view", "events.view", "messages.view", "messages.create", "messages.delete",
      "reports.view",
    ],
    student: [
      "dashboard.view", "attendance.view", "results.view", "student-fees.view", "fee-payments.view", "books.view", "transport.view", "timetable.view", "assignments.view",
      "announcements.view", "events.view", "messages.view", "messages.create", "messages.delete",
    ],
    parent: [
      "dashboard.view", "attendance.view", "results.view", "student-fees.view", "fee-payments.view", "books.view", "transport.view", "timetable.view", "assignments.view",
      "announcements.view", "events.view", "messages.view", "messages.create", "messages.delete",
    ],
  };

  for (const [slug, permNames] of Object.entries(ROLE_PERMISSION_DEFAULTS)) {
    const role = await prisma.role.findUnique({ where: { slug } });
    if (!role) continue;
    const perms = await prisma.permission.findMany({ where: { name: { in: permNames } } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log("✔ Granted default permissions to Principal, Teacher, Student, and other roles");

  // Default Super Admin user
  const passwordHash = await bcrypt.hash("ChangeMe@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@brightfuture.edu" },
    update: {},
    create: {
      firstName: "Super",
      lastName: "Admin",
      email: "admin@brightfuture.edu",
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });
  console.log("✔ Seeded default Super Admin user (admin@brightfuture.edu / ChangeMe@123)");

  // Languages
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log(`✔ Seeded ${LANGUAGES.length} languages`);

  // Settings
  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✔ Seeded ${SETTINGS.length} settings`);

  // Default attendance rule (Part 3)
  const existingRule = await prisma.attendanceRule.findFirst({ where: { isActive: true } });
  if (!existingRule) {
    await prisma.attendanceRule.create({
      data: { name: "Default Attendance Rule", minimumAttendancePercentage: 75, isActive: true },
    });
    console.log("✔ Seeded default attendance rule (75% minimum)");
  }

  // ==========================================================================
  // PART 2 — Sample Academic Data
  // ==========================================================================

  // Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { name: "2025-2026" },
    update: {},
    create: {
      name: "2025-2026",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2026-06-30"),
      isCurrent: true,
    },
  });
  console.log("✔ Seeded academic year 2025-2026");

  // Subjects
  const SUBJECTS = [
    { name: "English", code: "ENG101" },
    { name: "Urdu", code: "URD101" },
    { name: "Mathematics", code: "MATH101" },
    { name: "Science", code: "SCI101" },
    { name: "Islamiyat", code: "ISL101" },
    { name: "Computer Studies", code: "COMP101" },
  ];
  const subjects = [];
  for (const s of SUBJECTS) {
    const subject = await prisma.subject.upsert({ where: { code: s.code }, update: {}, create: s });
    subjects.push(subject);
  }
  console.log(`✔ Seeded ${subjects.length} subjects`);

  // Classes (Grade 1 - Grade 5) each with sections A & B
  const CLASS_NAMES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];
  const classes = [];
  for (let i = 0; i < CLASS_NAMES.length; i++) {
    const cls = await prisma.class.upsert({
      where: { name_academicYearId: { name: CLASS_NAMES[i], academicYearId: academicYear.id } },
      update: {},
      create: { name: CLASS_NAMES[i], numericGrade: i + 1, academicYearId: academicYear.id },
    });
    classes.push(cls);

    for (const sectionName of ["A", "B"]) {
      const section = await prisma.section.upsert({
        where: { name_classId: { name: sectionName, classId: cls.id } },
        update: {},
        create: { name: sectionName, classId: cls.id, capacity: 40 },
      });

      // Assign all subjects to every class
      for (const subject of subjects) {
        await prisma.classSubject.upsert({
          where: { classId_subjectId: { classId: cls.id, subjectId: subject.id } },
          update: {},
          create: { classId: cls.id, subjectId: subject.id },
        });
      }
      void section;
    }
  }
  console.log(`✔ Seeded ${classes.length} classes with sections A & B, and assigned all subjects`);

  // Teachers (with one linked to a login account to demo the Teacher dashboard)
  const teacherPasswordHash = await bcrypt.hash("Teacher@123", 12);
  const TEACHERS = [
    { firstName: "Ayesha", lastName: "Khan", email: "ayesha.khan@brightfuture.edu", designation: "Senior Teacher" },
    { firstName: "Bilal", lastName: "Ahmed", email: "bilal.ahmed@brightfuture.edu", designation: "Subject Teacher" },
    { firstName: "Sana", lastName: "Malik", email: "sana.malik@brightfuture.edu", designation: "Subject Teacher" },
    { firstName: "Usman", lastName: "Raza", email: "usman.raza@brightfuture.edu", designation: "Subject Teacher" },
  ];

  const teacherRole = await prisma.role.findUnique({ where: { slug: "teacher" } });
  const teachers = [];
  for (let i = 0; i < TEACHERS.length; i++) {
    const t = TEACHERS[i];
    const employeeCode = `TCH-2025-${String(i + 1).padStart(5, "0")}`;
    const existing = await prisma.teacher.findFirst({ where: { email: t.email } });
    const teacher = existing ?? (await prisma.teacher.create({
      data: {
        employeeCode,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        designation: t.designation,
        status: "ACTIVE",
        profile: { create: { experienceYears: 3 + i, specialization: SUBJECTS[i % SUBJECTS.length].name } },
        qualifications: { create: [{ degreeTitle: "B.Ed", institution: "University of Education", yearCompleted: 2018 + i }] },
        teacherSubjects: { create: [{ subjectId: subjects[i % subjects.length].id }] },
      },
    }));
    teachers.push(teacher);

    // First teacher also gets a portal login and is made class teacher of Grade 1 - A
    if (i === 0) {
      const teacherUser = await prisma.user.upsert({
        where: { email: t.email },
        update: {},
        create: {
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          passwordHash: teacherPasswordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
      if (teacherRole) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: teacherUser.id, roleId: teacherRole.id } },
          update: {},
          create: { userId: teacherUser.id, roleId: teacherRole.id },
        });
      }
      await prisma.teacher.update({ where: { id: teacher.id }, data: { userId: teacherUser.id } });

      const gradeOneSectionA = await prisma.section.findFirst({ where: { name: "A", class: { name: "Grade 1", academicYearId: academicYear.id } } });
      if (gradeOneSectionA) {
        await prisma.classTeacher.upsert({
          where: { sectionId: gradeOneSectionA.id },
          update: { teacherId: teacher.id },
          create: { sectionId: gradeOneSectionA.id, teacherId: teacher.id },
        });
      }
    }
  }
  console.log(`✔ Seeded ${teachers.length} teachers (1 with portal login: ayesha.khan@brightfuture.edu / Teacher@123)`);

  // Students (10 sample students spread across Grade 1 - A / B, first one gets a portal login)
  const studentPasswordHash = await bcrypt.hash("Student@123", 12);
  const studentRole = await prisma.role.findUnique({ where: { slug: "student" } });
  const gradeOne = await prisma.class.findFirst({ where: { name: "Grade 1", academicYearId: academicYear.id } });
  const gradeOneSections = gradeOne
    ? await prisma.section.findMany({ where: { classId: gradeOne.id } })
    : [];

  const STUDENT_NAMES = [
    ["Ahmed", "Raza"], ["Zainab", "Fatima"], ["Ali", "Hassan"], ["Mahnoor", "Siddiqui"],
    ["Hamza", "Sheikh"], ["Ayesha", "Noor"], ["Bilal", "Tariq"], ["Sara", "Iqbal"],
    ["Omar", "Farooq"], ["Hira", "Aslam"],
  ];

  let studentsCreated = 0;
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const [firstName, lastName] = STUDENT_NAMES[i];
    const registrationNumber = `STU-2025-${String(i + 1).padStart(5, "0")}`;
    const existing = await prisma.student.findFirst({ where: { registrationNumber } });
    if (existing) continue;

    const student = await prisma.student.create({
      data: {
        registrationNumber,
        firstName,
        lastName,
        status: "ACTIVE",
        admissionDate: new Date("2025-08-05"),
        profile: {
          create: {
            dateOfBirth: new Date(2019 - (i % 3), i % 12, (i % 27) + 1),
            gender: i % 2 === 0 ? "MALE" : "FEMALE",
            bloodGroup: "UNKNOWN",
            nationality: "Pakistani",
            city: "Karachi",
            emergencyContactName: `${lastName} Family`,
            emergencyContactPhone: "0300-0000000",
            emergencyContactRelation: "FATHER",
          },
        },
        guardians: {
          create: [
            {
              relation: "FATHER",
              firstName: `${lastName}`,
              lastName: "Sr.",
              phone: "0300-1234567",
              isPrimary: true,
            },
          ],
        },
        history: { create: { event: "ADMISSION", toValue: "ACTIVE", remarks: "Seeded sample student" } },
      },
    });

    if (gradeOneSections.length > 0) {
      const section = gradeOneSections[i % gradeOneSections.length];
      await prisma.studentEnrollment.create({
        data: {
          studentId: student.id,
          sectionId: section.id,
          academicYearId: academicYear.id,
          rollNumber: String(i + 1).padStart(2, "0"),
        },
      });
    }

    // First student gets a portal login to demo the Student dashboard
    if (i === 0) {
      const studentUser = await prisma.user.upsert({
        where: { email: "ahmed.raza.student@brightfuture.edu" },
        update: {},
        create: {
          firstName,
          lastName,
          email: "ahmed.raza.student@brightfuture.edu",
          passwordHash: studentPasswordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
      if (studentRole) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: studentUser.id, roleId: studentRole.id } },
          update: {},
          create: { userId: studentUser.id, roleId: studentRole.id },
        });
      }
      await prisma.student.update({ where: { id: student.id }, data: { userId: studentUser.id, email: studentUser.email } });
    }

    studentsCreated++;
  }
  console.log(`✔ Seeded ${studentsCreated} students (1 with portal login: ahmed.raza.student@brightfuture.edu / Student@123)`);

  // ==========================================================================
  // PART 4A — Sample Fees & Finance Data
  // ==========================================================================

  const FEE_CATEGORIES = [
    { name: "Admission Fee", description: "One-time fee charged at admission" },
    { name: "Tuition Fee", description: "Monthly/term academic tuition fee" },
    { name: "Examination Fee", description: "Per-term examination fee" },
    { name: "Library Fee", description: "Annual library access fee" },
    { name: "Transport Fee", description: "Monthly school transport fee" },
    { name: "Miscellaneous Fee", description: "Other miscellaneous charges" },
  ];
  const feeCategories = [];
  for (const c of FEE_CATEGORIES) {
    const category = await prisma.feeCategory.upsert({ where: { name: c.name }, update: {}, create: c });
    feeCategories.push(category);
  }
  console.log(`✔ Seeded ${feeCategories.length} fee categories`);

  // Tuition Fee structure for Grade 1 (both academic year classes seeded earlier)
  const gradeOneForFees = await prisma.class.findFirst({ where: { name: "Grade 1", academicYearId: academicYear.id } });
  const tuitionCategory = feeCategories.find((c) => c.name === "Tuition Fee");
  const admissionCategory = feeCategories.find((c) => c.name === "Admission Fee");

  if (gradeOneForFees && tuitionCategory) {
    const dueDate = new Date(academicYear.startDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    await prisma.feeStructure.upsert({
      where: {
        classId_academicYearId_feeCategoryId: {
          classId: gradeOneForFees.id,
          academicYearId: academicYear.id,
          feeCategoryId: tuitionCategory.id,
        },
      },
      update: {},
      create: {
        classId: gradeOneForFees.id,
        academicYearId: academicYear.id,
        feeCategoryId: tuitionCategory.id,
        amount: 5000,
        dueDate,
      },
    });
  }
  if (gradeOneForFees && admissionCategory) {
    await prisma.feeStructure.upsert({
      where: {
        classId_academicYearId_feeCategoryId: {
          classId: gradeOneForFees.id,
          academicYearId: academicYear.id,
          feeCategoryId: admissionCategory.id,
        },
      },
      update: {},
      create: {
        classId: gradeOneForFees.id,
        academicYearId: academicYear.id,
        feeCategoryId: admissionCategory.id,
        amount: 10000,
        dueDate: academicYear.startDate,
      },
    });
  }
  console.log("✔ Seeded sample fee structures for Grade 1 (Admission + Tuition)");

  // Sample scholarship (Scholarship.name isn't a unique column, so guard manually)
  const existingScholarship = await prisma.scholarship.findFirst({ where: { name: "Merit Scholarship" } });
  if (!existingScholarship) {
    await prisma.scholarship.create({
      data: { name: "Merit Scholarship", type: "PERCENTAGE", value: 20, description: "20% tuition discount for top academic performers" },
    });
    console.log("✔ Seeded sample scholarship: Merit Scholarship (20%)");
  }

  // ==========================================================================
  // PART 4B — Sample HR & Staff Data
  // ==========================================================================

  const DEPARTMENTS = [
    { name: "Academics", description: "Teaching staff and academic coordination" },
    { name: "Administration", description: "School administration and front office" },
    { name: "Finance", description: "Accounts and fee collection" },
    { name: "Facilities", description: "Maintenance, security, and transport" },
  ];
  const departments = [];
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({ where: { name: d.name }, update: {}, create: d });
    departments.push(dept);
  }
  console.log(`✔ Seeded ${departments.length} departments`);

  const DESIGNATIONS: Record<string, string[]> = {
    Academics: ["Subject Teacher", "Head of Department"],
    Administration: ["Office Assistant", "Front Desk Officer"],
    Finance: ["Accountant", "Cashier"],
    Facilities: ["Driver", "Security Guard", "Janitor"],
  };
  let designationCount = 0;
  for (const dept of departments) {
    const titles = DESIGNATIONS[dept.name] ?? [];
    for (const title of titles) {
      await prisma.designation.upsert({
        where: { departmentId_title: { departmentId: dept.id, title } },
        update: {},
        create: { departmentId: dept.id, title },
      });
      designationCount++;
    }
  }
  console.log(`✔ Seeded ${designationCount} designations`);

  // One sample non-teaching employee (Accountant in Finance)
  const financeDept = departments.find((d) => d.name === "Finance");
  const accountantDesignation = financeDept
    ? await prisma.designation.findFirst({ where: { departmentId: financeDept.id, title: "Accountant" } })
    : null;
  if (financeDept && accountantDesignation) {
    const existingEmployee = await prisma.employee.findFirst({ where: { email: "farah.accounts@brightfuture.edu" } });
    if (!existingEmployee) {
      await prisma.employee.create({
        data: {
          employeeCode: "EMP-2025-00001",
          firstName: "Farah",
          lastName: "Siddiqui",
          email: "farah.accounts@brightfuture.edu",
          phone: "0300-9998888",
          departmentId: financeDept.id,
          designationId: accountantDesignation.id,
          salary: 55000,
          status: "ACTIVE",
        },
      });
      console.log("✔ Seeded sample employee: Farah Siddiqui (Accountant)");
    }
  }

  // ==========================================================================
  // PART 4B — Sample Library Data
  // ==========================================================================

  const BOOK_CATEGORIES = ["Fiction", "Science", "Mathematics", "History", "Reference"];
  const bookCategories = [];
  for (const name of BOOK_CATEGORIES) {
    const cat = await prisma.bookCategory.upsert({ where: { name }, update: {}, create: { name } });
    bookCategories.push(cat);
  }
  console.log(`✔ Seeded ${bookCategories.length} book categories`);

  const SAMPLE_BOOKS = [
    { title: "Alice in Wonderland", author: "Lewis Carroll", category: "Fiction", quantity: 3 },
    { title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", quantity: 2 },
    { title: "Elementary Algebra", author: "Harold Jacobs", category: "Mathematics", quantity: 4 },
    { title: "The Story of Pakistan", author: "K.K. Aziz", category: "History", quantity: 2 },
    { title: "Oxford School Atlas", author: "Oxford Press", category: "Reference", quantity: 5 },
  ];
  let booksSeeded = 0;
  for (const b of SAMPLE_BOOKS) {
    const category = bookCategories.find((c) => c.name === b.category);
    if (!category) continue;
    const existing = await prisma.book.findFirst({ where: { title: b.title, author: b.author } });
    if (existing) continue;
    await prisma.book.create({
      data: {
        title: b.title,
        author: b.author,
        categoryId: category.id,
        quantity: b.quantity,
        availableQuantity: b.quantity,
      },
    });
    booksSeeded++;
  }
  console.log(`✔ Seeded ${booksSeeded} sample books`);

  // ==========================================================================
  // PART 4B — Sample Transport Data
  // ==========================================================================

  const vehicle1 = await prisma.vehicle.upsert({
    where: { vehicleNumber: "LEA-4521" },
    update: {},
    create: { vehicleNumber: "LEA-4521", model: "Toyota Coaster", capacity: 30 },
  });
  const driver1 = await prisma.driver.upsert({
    where: { licenseNumber: "DL-2020-11223" },
    update: {},
    create: { name: "Aslam Khan", phone: "0301-2345678", licenseNumber: "DL-2020-11223" },
  });
  const existingRoute = await prisma.route.findFirst({ where: { routeName: "Route A - Gulshan" } });
  if (!existingRoute) {
    await prisma.route.create({
      data: {
        routeName: "Route A - Gulshan",
        startPoint: "Gulshan-e-Iqbal",
        endPoint: "Bright Future School",
        monthlyFee: 3000,
        vehicleId: vehicle1.id,
        driverId: driver1.id,
      },
    });
    console.log("✔ Seeded sample vehicle, driver, and transport route");
  }

  // ==========================================================================
  // PART 5 — Sample Inventory Data
  // ==========================================================================

  const stationeryCategory = await prisma.inventoryCategory.upsert({
    where: { name: "Stationery" },
    update: {},
    create: { name: "Stationery", description: "Pens, notebooks, and general office/classroom supplies" },
  });
  await prisma.inventoryCategory.upsert({
    where: { name: "Sports Equipment" },
    update: {},
    create: { name: "Sports Equipment", description: "Balls, kits, and other sporting gear" },
  });
  await prisma.inventoryCategory.upsert({
    where: { name: "IT Equipment" },
    update: {},
    create: { name: "IT Equipment", description: "Computers, projectors, and lab hardware" },
  });

  const whiteboardMarkers = await prisma.inventoryItem.upsert({
    where: { sku: "STA-0001" },
    update: {},
    create: {
      name: "Whiteboard Markers (Box of 12)",
      sku: "STA-0001",
      categoryId: stationeryCategory.id,
      unit: "BOX",
      quantity: 40,
      reorderLevel: 10,
      unitPrice: 450,
      supplier: "Karachi Stationers",
      location: "Main Store",
    },
  });
  await prisma.inventoryItem.upsert({
    where: { sku: "STA-0002" },
    update: {},
    create: {
      name: "A4 Printing Paper (Ream)",
      sku: "STA-0002",
      categoryId: stationeryCategory.id,
      unit: "REAM",
      quantity: 8,
      reorderLevel: 15,
      unitPrice: 900,
      supplier: "Karachi Stationers",
      location: "Main Store",
    },
  });

  const inventoryTxExists = await prisma.inventoryTransaction.findFirst({ where: { itemId: whiteboardMarkers.id } });
  if (!inventoryTxExists) {
    await prisma.inventoryTransaction.create({
      data: {
        itemId: whiteboardMarkers.id,
        type: "STOCK_IN",
        quantity: 40,
        reason: "Initial stock",
        performedById: admin.id,
      },
    });
  }
  console.log("✔ Seeded sample inventory categories, items, and a stock transaction");

  // ==========================================================================
  // PART 5 — Sample Messaging & Announcement Data
  // ==========================================================================

  const teacherUser = await prisma.user.findUnique({ where: { email: "ayesha.khan@brightfuture.edu" } });
  if (teacherUser) {
    const welcomeMsgExists = await prisma.message.findFirst({
      where: { senderId: admin.id, recipientId: teacherUser.id, subject: "Welcome to the School ERP" },
    });
    if (!welcomeMsgExists) {
      await prisma.message.create({
        data: {
          senderId: admin.id,
          recipientId: teacherUser.id,
          subject: "Welcome to the School ERP",
          content: "Hi, welcome aboard! Let us know if you need any help getting started with the portal.",
        },
      });
      console.log("✔ Seeded a sample welcome message");
    }
  }

  const announcementExists = await prisma.announcement.findFirst({ where: { title: "Welcome to the New Academic Year" } });
  if (!announcementExists) {
    await prisma.announcement.create({
      data: {
        title: "Welcome to the New Academic Year",
        content: "We are excited to welcome all students, parents, and staff to the new academic year. Please check the portal regularly for updates.",
        audience: "ALL",
        isPinned: true,
        publishedById: admin.id,
      },
    });
    console.log("✔ Seeded a sample pinned announcement");
  }

  console.log("🎉 Foundation + Academic + Fees + HR Layer seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
