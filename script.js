// ===== IMPORT FIREBASE MODULES =====
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// ===== FIREBASE SETUP =====
const auth = window.firebase.auth;
const db = window.firebase.db;

// ===== GLOBAL STATE =====
let tasks = [];

// ===== TASK MANAGEMENT =====
const form = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

async function fetchTasks() {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
  const snapshot = await getDocs(q);
  tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderTasks();
}

async function addTask(task) {
  const user = auth.currentUser;
  if (!user) return alert("User not authenticated!");

  task.userId = user.uid;
  const docRef = await addDoc(collection(db, "tasks"), task);
  task.id = docRef.id;
  tasks.push(task);
  renderTasks();
}

async function toggleTaskCompletion(index) {
  const task = tasks[index];
  task.completed = !task.completed;
  await updateDoc(doc(db, "tasks", task.id), { completed: task.completed });
  renderTasks();
}

async function deleteTask(index) {
  const task = tasks[index];
  await deleteDoc(doc(db, "tasks", task.id));
  tasks.splice(index, 1);
  renderTasks();
}

function createTaskElement(task, index) {
  const card = document.createElement('div');
  card.className = 'task-card';
  if (task.completed) card.classList.add('completed');

  const top = document.createElement('div');
  top.className = 'top';

  const title = document.createElement('h3');
  title.textContent = task.title;

  const buttons = document.createElement('div');
  buttons.className = 'task-actions';

  const completeBtn = document.createElement('button');
  completeBtn.textContent = task.completed ? 'Undo' : 'Done';
  completeBtn.className = 'task-btn complete-btn';
  completeBtn.onclick = () => toggleTaskCompletion(index);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'task-btn delete-btn';
  deleteBtn.onclick = () => deleteTask(index);

  buttons.appendChild(completeBtn);
  buttons.appendChild(deleteBtn);
  top.appendChild(title);
  top.appendChild(buttons);

  const tags = document.createElement('div');
  tags.className = 'tags';

  if (task.category) tags.appendChild(Object.assign(document.createElement('span'), { textContent: `📁 ${task.category}` }));
  if (task.priority) tags.appendChild(Object.assign(document.createElement('span'), { textContent: `⚡ ${task.priority}` }));

  if (task.date) {
    const dateTag = document.createElement('span');
    dateTag.textContent = `📅 ${task.date}`;
    if (task.date < new Date().toISOString().split("T")[0]) dateTag.style.backgroundColor = "#ff6b6b";
    tags.appendChild(dateTag);
  }

  card.appendChild(top);
  card.appendChild(tags);
  return card;
}

function renderTasks(showTodayOnly = false, showImportantOnly = false) {
  taskList.innerHTML = '';
  const today = new Date().toISOString().split('T')[0];

  tasks.forEach((task, index) => {
    if (showTodayOnly && task.date !== today) return;
    if (showImportantOnly && task.priority !== 'High') return;
    taskList.appendChild(createTaskElement(task, index));
  });
}

form.onsubmit = async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const category = document.getElementById('task-category').value.trim();
  const priority = document.getElementById('task-priority').value;
  const date = document.getElementById('task-date').value;

  if (!title) return alert('Please enter a task title.');

  const newTask = { title, category, priority, date, completed: false };
  await addTask(newTask);
  form.reset();
};

// ===== AUTH SYSTEM =====
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const mainApp = document.getElementById('main-app');
const authSection = document.getElementById('auth-section');

// Register function - Fixed to ensure user has to manually login after registration
registerBtn.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) return alert('❗ Email and password are required.');

  try {
    // Explicitly set a flag before creating the user
    // This will help us prevent the automatic login
    window.isRegistering = true;
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await addDoc(collection(db, "users"), {
      uid: user.uid,
      email: user.email
    });

    // Sign out the user immediately
    await signOut(auth);
    
    // Clear the form fields
    authForm.reset();
    
    alert('🎉 Registered successfully! Please login with your credentials.');
    
  } catch (err) {
    alert('❌ Registration failed: ' + err.message);
  } finally {
    // Clean up the registration flag
    window.isRegistering = false;
  }
};

// Login function
loginBtn.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) return alert('❗ Email and password are required.');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Auth state change listener will handle showing the main app
  } catch (err) {
    alert('❌ Login failed: ' + err.message);
  }
};

// Logout function
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.onclick = async () => {
  await signOut(auth);
  // Auth state change listener will handle showing the auth section
};

// ===== SIDEBAR FUNCTIONALITY =====
document.addEventListener('DOMContentLoaded', function () {
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const closeBtn = document.querySelector('.close-btn');
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  hamburgerBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    sidebar.classList.add('active');
    backdrop.style.display = 'block';
    hamburgerBtn.style.opacity = '0';
    hamburgerBtn.style.pointerEvents = 'none';
  });

  closeBtn.addEventListener('click', function () {
    sidebar.classList.remove('active');
    backdrop.style.display = 'none';
    hamburgerBtn.style.opacity = '1';
    hamburgerBtn.style.pointerEvents = 'auto';
  });

  backdrop.addEventListener('click', function () {
    sidebar.classList.remove('active');
    backdrop.style.display = 'none';
    hamburgerBtn.style.opacity = '1';
    hamburgerBtn.style.pointerEvents = 'auto';
  });

  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const section = this.dataset.section;
      switch (section) {
        case 'dashboard':
        case 'all-tasks': renderTasks(); break;
        case 'today-tasks': renderTasks(true); break;
        case 'important': renderTasks(false, true); break;
      }

      sidebar.classList.remove('active');
      backdrop.style.display = 'none';
      hamburgerBtn.style.opacity = '1';
      hamburgerBtn.style.pointerEvents = 'auto';
    });
  });
});

// ===== LOAD TASKS IF USER ALREADY LOGGED IN =====
onAuthStateChanged(auth, async (user) => {
  if (user && !window.isRegistering) {
    // Only show the main app if user is logged in AND we're not in the registration process
    mainApp.style.display = 'block';
    authSection.style.display = 'none';
    await fetchTasks();
  } else {
    // Show auth section if no user or during registration
    mainApp.style.display = 'none';
    authSection.style.display = 'block';
    
    // If we're handling a logout or registration completion, clear any tasks from memory
    if (!user) {
      tasks = [];
    }
  }
});
