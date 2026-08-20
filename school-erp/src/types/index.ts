export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  roles: string[];
  permissions: string[];
  preferredLanguage: string;
  preferredTheme: string;
}

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  roles: { id: string; name: string }[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  userCount?: number;
}

export interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description: string | null;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userName?: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string | null;
  userName?: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NavItem {
  label: string;
  labelKey: string;
  href: string;
  icon: string;
  permission?: string;
  children?: NavItem[];
}

// ============================================================================
// PART 2 — Academic Management Types
// ============================================================================

export type StudentStatus = "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED" | "EXPELLED" | "TRANSFERRED";
export type TeacherStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "RESIGNED" | "TERMINATED";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface StudentListItem {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: StudentStatus;
  photoUrl?: string | null;
  className?: string | null;
  sectionName?: string | null;
  admissionDate: string;
}

export interface TeacherListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: TeacherStatus;
  designation: string | null;
  photoUrl?: string | null;
  subjectCount?: number;
  sectionName?: string | null; // if class teacher
}

export interface ClassItem {
  id: string;
  name: string;
  numericGrade: number;
  academicYearId: string;
  sections: SectionItem[];
}

export interface SectionItem {
  id: string;
  name: string;
  classId: string;
  className?: string;
  capacity: number;
  studentCount?: number;
  classTeacherName?: string | null;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  classCount?: number;
}

export interface AcademicYearItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

// ============================================================================
// PART 4A — Fees & Finance Types
// ============================================================================

export type FeeStatus = "ACTIVE" | "INACTIVE";
export type StudentFeeStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "WAIVED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "ONLINE" | "OTHER";
export type ScholarshipType = "PERCENTAGE" | "FIXED";

export interface FeeCategoryItem {
  id: string;
  name: string;
  description: string | null;
  status: FeeStatus;
  structureCount?: number;
}

export interface FeeStructureItem {
  id: string;
  classId: string;
  className: string;
  academicYearId: string;
  academicYearName: string;
  feeCategoryId: string;
  feeCategoryName: string;
  amount: number;
  dueDate: string;
  status: FeeStatus;
  assignedCount?: number;
}

export interface StudentFeeItem {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  feeCategoryName: string;
  className: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: StudentFeeStatus;
}

export interface FeePaymentItem {
  id: string;
  receiptNumber: string;
  studentFeeId: string;
  studentName: string;
  registrationNumber: string;
  feeCategoryName: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  collectedByName: string | null;
}

export interface ScholarshipItem {
  id: string;
  name: string;
  type: ScholarshipType;
  value: number;
  description: string | null;
  status: FeeStatus;
  studentCount?: number;
}

// ============================================================================
// PART 4B — HR & Staff Management Types
// ============================================================================

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "RESIGNED" | "TERMINATED";

export interface DepartmentItem {
  id: string;
  name: string;
  description: string | null;
  employeeCount?: number;
  designationCount?: number;
}

export interface DesignationItem {
  id: string;
  departmentId: string;
  departmentName?: string;
  title: string;
  description: string | null;
  employeeCount?: number;
}

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departmentName: string;
  designationTitle: string;
  status: EmployeeStatus;
  joiningDate: string;
}

// ============================================================================
// PART 4B — Payroll Types
// ============================================================================

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface SalaryStructureItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
}

export interface PayrollItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  paymentStatus: PaymentStatus;
  paymentDate: string | null;
}

// ============================================================================
// PART 4B — Library Management Types
// ============================================================================

export type BookIssueStatus = "ISSUED" | "RETURNED" | "OVERDUE" | "LOST";

export interface BookCategoryItem {
  id: string;
  name: string;
  description: string | null;
  bookCount?: number;
}

export interface BookItem {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  quantity: number;
  availableQuantity: number;
  shelfLocation: string | null;
}

export interface BookIssueItem {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  fineAmount: number;
  finePaid: boolean;
  status: BookIssueStatus;
}

// ============================================================================
// PART 4B — Transport Management Types
// ============================================================================

export type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
export type DriverStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";
export type TransportAssignmentStatus = "ACTIVE" | "INACTIVE";

export interface VehicleItem {
  id: string;
  vehicleNumber: string;
  model: string | null;
  capacity: number;
  status: VehicleStatus;
  routeCount?: number;
}

export interface DriverItem {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: DriverStatus;
  routeCount?: number;
}

export interface RouteItem {
  id: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  monthlyFee: number;
  vehicleId: string | null;
  vehicleNumber: string | null;
  driverId: string | null;
  driverName: string | null;
  assignedStudentCount?: number;
}

export interface StudentTransportItem {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  routeId: string;
  routeName: string;
  monthlyFee: number;
  assignedDate: string;
  status: TransportAssignmentStatus;
}

// ============================================================================
// PART 5 — Inventory Management Types
// ============================================================================

export type InventoryUnit = "PCS" | "BOX" | "PACKET" | "KG" | "LITRE" | "SET" | "REAM" | "OTHER";
export type InventoryItemStatus = "ACTIVE" | "DISCONTINUED";
export type InventoryTransactionType = "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

export interface InventoryCategoryItem {
  id: string;
  name: string;
  description: string | null;
  itemCount?: number;
}

export interface InventoryItemRow {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  categoryName: string;
  unit: InventoryUnit;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  totalValue: number;
  supplier: string | null;
  location: string | null;
  status: InventoryItemStatus;
  isLowStock: boolean;
}

export interface InventoryTransactionRow {
  id: string;
  itemId: string;
  itemName: string;
  unit: InventoryUnit;
  type: InventoryTransactionType;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

// ============================================================================
// PART 5 — Messaging & Announcements Types
// ============================================================================

export type MessageStatus = "UNREAD" | "READ";
export type AnnouncementAudience = "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";

export interface MessageParticipant {
  id: string;
  name: string;
  email: string;
}

export interface MessageItem {
  id: string;
  subject: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
  readAt: string | null;
  sender: MessageParticipant;
  recipient: MessageParticipant;
}

export interface MessageDirectoryUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  publishedBy: string;
}

// ============================================================================
// PART 6 — Timetable Types
// ============================================================================

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface TimetablePeriodItem {
  id: string;
  sectionId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
}

export interface TeacherSchedulePeriod {
  id: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  subjectName: string;
  className: string;
  sectionName: string;
}

// ============================================================================
// PART 7 — Assignments Types
// ============================================================================

export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type SubmissionStatus = "PENDING" | "SUBMITTED" | "LATE" | "GRADED";

export interface AssignmentMySubmission {
  id: string;
  status: SubmissionStatus;
  submittedAt: string;
  marksObtained: number | null;
  feedback: string | null;
}

export interface AssignmentItem {
  id: string;
  sectionId: string;
  className: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  title: string;
  description: string;
  attachmentUrl: string | null;
  maxMarks: number | null;
  dueDate: string;
  status: AssignmentStatus;
  createdAt: string;
  submissionCount?: number;
  mySubmission?: AssignmentMySubmission | null;
}

export interface AssignmentSubmissionRow {
  studentId: string;
  studentName: string;
  registrationNumber: string;
  submissionId: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  content: string | null;
  attachmentUrl: string | null;
  marksObtained: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

// ============================================================================
// PART 8 — Events & Calendar Types
// ============================================================================

export type EventType = "HOLIDAY" | "EXAM" | "MEETING" | "FUNCTION" | "SPORTS" | "OTHER";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  audience: AnnouncementAudience;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  createdBy: string;
}
