export enum PermissionName {
  CreateUser = 'create_user',
  ViewUser = 'view_user',
  AssignRole = 'assign_role',
  AddExpense = 'add_expense',
  ViewExpense = 'view_expense',
  ViewReports = 'view_reports',
  ViewFoodTimetable = 'view_food_timetable',
}

export const ALL_PERMISSIONS = Object.values(PermissionName);
