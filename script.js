// ===== FIREBASE SETUP =====
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// ===== GLOBAL STATE =====
let tasks = [];

// ===== TASK MANAGEMENT =====
const form = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

const loadingMessage = document.getElementById('loading-message');
const successMessage = document.getElementById('success-message');

function showLoading() {
  loadingMessage.style.display = 'block';
}

function hideLoading() {
  loadingMessage.style.display = 'none';
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  setTimeout(() => {
    successMessage.style.display = 'none';
  }, 3000);
}

function showError(message) {
  alert(message);
}

async function fetchTasks() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    showLoading();
    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTasks();
  } catch (error) {
    showError('❌ Error fetching tasks: ' + error.message);
  } finally {
    hideLoading();
  }
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
  try {
    showLoading();
    await updateDoc(doc(db, "tasks", task.id), { completed: task.completed });
    renderTasks();
    showSuccess(`✅ Task marked as ${task.completed ? 'completed' : 'incomplete'}`);
  } catch (error) {
    showError('❌ Task update failed: ' + error.message);
  } finally {
    hideLoading();
  }
}

async function deleteTask(index) {
  const task = tasks[index];
  try {
    showLoading();
    await deleteDoc(doc(db, "tasks", task.id));
    tasks.splice(index, 1);
    renderTasks();
    showSuccess('🎉 Task deleted successfully!');
  } catch (error) {
    showError('❌ Task deletion failed: ' + error.message);
  } finally {
    hideLoading();
  }
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

// ===== AUTH SYSTEM =====
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const mainApp = document.getElementById('main-app');
const authSection = document.getElementById('auth-section');
const loginSection = document.getElementById('login-section');

// Register function - Fixed to ensure user has to manually login after registration
// Register
registerBtn.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) return alert('❗ Email and password are required.');

  try {
    // Explicitly set a flag before creating the user
    // This will help us prevent the automatic login
    window.isRegistering = true;
    
    showLoading();
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
// Login
loginBtn.onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) return alert('❗ Email and password are required.');

  try {
    showLoading();
    await signInWithEmailAndPassword(auth, email, password);
    // Auth state change listener will handle showing the main app
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
    await fetchTasks();
    showSuccess('🎉 Successfully logged in!');
  } catch (err) {
    showError('❌ Login failed: ' + err.message);
  } finally {
    hideLoading();
  }
};
// Logout
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.onclick = async () => {
  showLoading();
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