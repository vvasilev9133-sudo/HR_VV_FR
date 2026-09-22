const STORAGE_KEY = 'hr-record-tracker-v2';
const YEAR = 2026;
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const projectColumns = ['1', '3', '5', '7', '15', '19', '20', '31'];
let selectedMonth = new Date().getMonth();
let currentUser = null;

const accounts = {
  admin: { role: 'admin', label: 'Administrator', password: 'admin123' },
  'employee-0': { role: 'employee', employeeIndex: 0, label: 'Employee 1', password: 'employee123' }
};

const seedEmployees = [
  ['JC', 'jonatahn Clauel', 'jonatahn.clauel@email.com', '(876) 345-753', 'PRJ01'],
  ['VK', 'Vinsen Knafu', 'vinsen.knafu@email.com', '(556)125-843', 'PRJ01'],
  ['BR', 'Briana Reed', 'briana.reed@email.com', '(345) 267-884', 'PRJ02'],
  ['LM', 'Liam Morris', 'liam.morris@email.com', '(221) 472-204', 'PRJ03']
];

function getDaysInMonth(monthIndex) {
  return new Date(YEAR, monthIndex + 1, 0).getDate();
}

function makeBlankAttendance() {
  return months.map((_, monthIndex) => Array(getDaysInMonth(monthIndex)).fill('0'));
}

function makeBlankEmployee(index, seed) {
  const details = seed || [`E${index + 1}`, `New Employee ${index + 1}`, `employee${index + 1}@mail.com`, '(000) 000-000', `PRJ${String(index + 1).padStart(2, '0')}`];
  return {
    avatar: details[0],
    name: details[1],
    email: details[2],
    phone: details[3],
    project: details[4],
    values: Array(projectColumns.length).fill('0'),
    attendance: makeBlankAttendance()
  };
}

const defaultEmployees = seedEmployees.map((employee, index) => makeBlankEmployee(index, employee));
while (defaultEmployees.length < 50) defaultEmployees.push(makeBlankEmployee(defaultEmployees.length));

function ensureAttendance(employee) {
  const attendance = Array.isArray(employee.attendance) ? employee.attendance : [];
  employee.attendance = months.map((_, monthIndex) => {
    const days = getDaysInMonth(monthIndex);
    return Array.from({ length: days }, (_, dayIndex) => attendance[monthIndex]?.[dayIndex] || '0');
  });
  return employee;
}

function ensureEmployees(employees) {
  const normalized = Array.isArray(employees) ? employees : [];
  normalized.forEach((employee, index) => {
    employee.avatar ||= `E${index + 1}`;
    employee.name ||= `New Employee ${index + 1}`;
    employee.email ||= `employee${index + 1}@mail.com`;
    employee.phone ||= '(000) 000-000';
    employee.project ||= 'PRJ00';
    employee.values = Array.isArray(employee.values)
      ? employee.values.slice(0, projectColumns.length).concat(Array(projectColumns.length).fill('0')).slice(0, projectColumns.length)
      : Array(projectColumns.length).fill('0');
    ensureAttendance(employee);
  });
  while (normalized.length < 50) normalized.push(makeBlankEmployee(normalized.length));
  return normalized;
}

function getEmployees() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh = JSON.parse(JSON.stringify(defaultEmployees));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
  try {
    const employees = ensureEmployees(JSON.parse(raw));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    return employees;
  } catch {
    return JSON.parse(JSON.stringify(defaultEmployees));
  }
}

function saveEmployees(employees) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

function isWeekend(day) {
  const weekday = new Date(YEAR, selectedMonth, day).getDay();
  return weekday === 0 || weekday === 6;
}

function weekdayLabel(day) {
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(YEAR, selectedMonth, day));
}

function renderMonthTabs() {
  const tabs = document.getElementById('monthTabs');
  tabs.innerHTML = months.map((month, monthIndex) => `
    <button type="button" class="month-tab ${monthIndex === selectedMonth ? 'active' : ''}" data-month-index="${monthIndex}">${month}</button>
  `).join('');
}

function renderTable() {
  const employees = getEmployees();
  const visibleEmployees = currentUser?.role === 'employee'
    ? [employees[currentUser.employeeIndex]]
    : employees;
  const days = getDaysInMonth(selectedMonth);
  const header = ['Avatar', 'Full name / email', 'Phone', 'Project #'];
  const dayHeaders = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    return `<th class="${isWeekend(day) ? 'weekend' : ''}">${day}<small>${weekdayLabel(day)}</small></th>`;
  }).join('');

  const rows = visibleEmployees.map((employee) => {
    const employeeIndex = employees.indexOf(employee);
    const monthValues = employee.attendance[selectedMonth];
    const total = monthValues.filter((value) => value === 'v').length;
    const dayCells = monthValues.map((value, dayIndex) => {
      const day = dayIndex + 1;
      return `<td class="${isWeekend(day) ? 'weekend' : ''}"><select class="status-select" data-employee="${employeeIndex}" data-day="${day}"><option value="0" ${value === '0' ? 'selected' : ''}>0</option><option value="v" ${value === 'v' ? 'selected' : ''}>v</option><option value="x" ${value === 'x' ? 'selected' : ''}>x</option></select></td>`;
    }).join('');
    return `<tr>
      <td><strong>${employee.avatar}</strong></td>
      <td><div class="name-stack"><span>${employee.name}</span><small>${employee.email}</small></div></td>
      <td>${employee.phone}</td><td>${employee.project}</td>${dayCells}
      <td class="numeric-cell"><strong>${total}</strong></td>
    </tr>`;
  }).join('');

  document.getElementById('employeeTable').innerHTML = `<thead><tr>${header.map((item) => `<th>${item}</th>`).join('')}${dayHeaders}<th>Total</th></tr></thead><tbody>${rows}</tbody>`;
  document.getElementById('currentMonthLabel').textContent = `${months[selectedMonth]} ${YEAR}`;
  document.getElementById('employeeCount').textContent = currentUser?.role === 'employee' ? '1' : employees.length;

  const totalChecks = employees.reduce((sum, employee) => sum + employee.attendance[selectedMonth].filter((value) => value === 'v').length, 0);
  const totalCells = visibleEmployees.length * days;
  const completionRate = totalCells ? Math.round((totalChecks / totalCells) * 100) : 0;
  document.getElementById('totalChecks').textContent = totalChecks;
  document.getElementById('completionRate').textContent = `${completionRate}%`;
  document.getElementById('analysisText').textContent = currentUser?.role === 'employee'
    ? `Your ${months[selectedMonth]} attendance is shown here. Saturdays and Sundays are highlighted.`
    : `${months[selectedMonth]} has ${days} days. Saturdays and Sundays are highlighted for quick visibility. ${totalChecks} positive checks are recorded for the month.`;
}

function handleTableChange(event) {
  const select = event.target;
  if (!select.matches('.status-select')) return;
  const employees = getEmployees();
  employees[Number(select.dataset.employee)].attendance[selectedMonth][Number(select.dataset.day) - 1] = select.value;
  saveEmployees(employees);
  renderTable();
}

function addEmployee() {
  if (currentUser?.role !== 'admin') return;
  const employees = getEmployees();
  employees.push(makeBlankEmployee(employees.length));
  saveEmployees(employees);
  renderTable();
}

function resetData() {
  if (currentUser?.role !== 'admin') return;
  saveEmployees(JSON.parse(JSON.stringify(defaultEmployees)));
  renderTable();
}

function showApplication(accountKey) {
  currentUser = accounts[accountKey];
  sessionStorage.setItem('hr-session', accountKey);
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  document.getElementById('currentUserLabel').textContent = currentUser.label;
  document.getElementById('addEmployeeBtn').classList.toggle('hidden', currentUser.role !== 'admin');
  document.getElementById('resetBtn').classList.toggle('hidden', currentUser.role !== 'admin');
  renderMonthTabs();
  renderTable();
}

function init() {
  document.getElementById('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const accountKey = document.getElementById('accountSelect').value;
    const password = document.getElementById('passwordInput').value;
    const message = document.getElementById('loginMessage');
    if (accounts[accountKey].password !== password) {
      message.textContent = 'Incorrect password.';
      return;
    }
    message.textContent = '';
    showApplication(accountKey);
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('hr-session');
    currentUser = null;
    document.getElementById('appShell').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('passwordInput').value = '';
  });

  document.getElementById('monthTabs').addEventListener('click', (event) => {
    const tab = event.target.closest('.month-tab');
    if (!tab) return;
    selectedMonth = Number(tab.dataset.monthIndex);
    renderMonthTabs();
    renderTable();
  });
  document.getElementById('employeeTable').addEventListener('change', handleTableChange);
  document.getElementById('addEmployeeBtn').addEventListener('click', addEmployee);
  document.getElementById('resetBtn').addEventListener('click', resetData);

  const savedSession = sessionStorage.getItem('hr-session');
  if (accounts[savedSession]) showApplication(savedSession);
}

document.addEventListener('DOMContentLoaded', init);
