// ===== TASK MANAGEMENT =====
const form = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
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
  completeBtn.onclick = () => {
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'task-btn delete-btn';
  deleteBtn.onclick = () => {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  };

  buttons.appendChild(completeBtn);
  buttons.appendChild(deleteBtn);

  top.appendChild(title);
  top.appendChild(buttons);

  const tags = document.createElement('div');
  tags.className = 'tags';

  if (task.category) {
    const categoryTag = document.createElement('span');
    categoryTag.textContent = `📁 ${task.category}`;
    tags.appendChild(categoryTag);
  }

  if (task.priority) {
    const priorityTag = document.createElement('span');
    priorityTag.textContent = `⚡ ${task.priority}`;
    tags.appendChild(priorityTag);
  }

  if (task.date) {
    const dateTag = document.createElement('span');
    dateTag.textContent = `📅 ${task.date}`;

    const today = new Date().toISOString().split("T")[0];
    if (task.date < today) {
      dateTag.style.backgroundColor = "#ff6b6b";
    }

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
    
    const taskEl = createTaskElement(task, index);
    taskList.appendChild(taskEl);
  });
}

form.onsubmit = (e) => {
  e.preventDefault();

  const title = document.getElementById('task-title').value.trim();
  const category = document.getElementById('task-category').value.trim();
  const priority = document.getElementById('task-priority').value;
  const date = document.getElementById('task-date').value;

  if (!title) return;

  const newTask = {
    title,
    category,
    priority,
    date,
    completed: false,
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();
  form.reset();
};

// ===== AUTH SYSTEM =====
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const mainApp = document.getElementById('main-app');
const authSection = document.getElementById('auth-section');

loginBtn.onclick = (e) => {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  const users = JSON.parse(localStorage.getItem('taskflow-users')) || [];
  const foundUser = users.find(user => user.username === username && user.password === password);

  if (foundUser) {
    localStorage.setItem('taskflow-current-user', JSON.stringify(foundUser));
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
  } else {
    alert('❌ Invalid credentials. Please try again or register.');
  }
};

registerBtn.onclick = (e) => {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!username || !password) {
    alert('❗ Both username and password are required to register.');
    return;
  }

  const users = JSON.parse(localStorage.getItem('taskflow-users')) || [];
  const userExists = users.some(user => user.username === username);

  if (userExists) {
    alert('⚠️ Username already exists. Choose a different one.');
    return;
  }

  users.push({ username, password });
  localStorage.setItem('taskflow-users', JSON.stringify(users));
  alert('🎉 Registered successfully! Now login.');
  authForm.reset();
};

// ===== LOGOUT FUNCTIONALITY =====
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.onclick = () => {
  localStorage.removeItem('taskflow-current-user');
  mainApp.style.display = 'none';
  authSection.style.display = 'block';
};

// ===== SIDEBAR FUNCTIONALITY =====
document.addEventListener('DOMContentLoaded', function() {
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const closeBtn = document.querySelector('.close-btn');
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  const mainMenu = document.querySelector('.main-menu');
  const settingsMenu = document.querySelector('.settings-menu');
  const backBtn = document.querySelector('.back-btn');

  hamburgerBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    sidebar.classList.add('active');
    backdrop.style.display = 'block';
    hamburgerBtn.style.opacity = '0';
    hamburgerBtn.style.pointerEvents = 'none';
  });

  closeBtn.addEventListener('click', function() {
    sidebar.classList.remove('active');
    backdrop.style.display = 'none';
    hamburgerBtn.style.opacity = '1';
    hamburgerBtn.style.pointerEvents = 'auto';
  });

  backdrop.addEventListener('click', function() {
    sidebar.classList.remove('active');
    backdrop.style.display = 'none';
    hamburgerBtn.style.opacity = '1';
    hamburgerBtn.style.pointerEvents = 'auto';
  });

  document.addEventListener('click', function(event) {
    if (!sidebar.contains(event.target) && event.target !== hamburgerBtn) {
      sidebar.classList.remove('active');
      backdrop.style.display = 'none';
      hamburgerBtn.style.opacity = '1';
      hamburgerBtn.style.pointerEvents = 'auto';
    }
  });

  sidebar.addEventListener('click', function(e) {
    e.stopPropagation();
  });

  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.dataset.section;
      
      if (section === 'settings') {
        mainMenu.style.display = 'none';
        settingsMenu.style.display = 'block';
        backBtn.style.display = 'block';
      } else {
        showSection(section);
      }
    });
  });

  backBtn.addEventListener('click', function() {
    settingsMenu.style.display = 'none';
    mainMenu.style.display = 'block';
    this.style.display = 'none';
  });

  function showSection(section) {
    switch(section) {
      case 'dashboard':
        renderTasks();
        break;
      case 'all-tasks':
        renderTasks();
        break;
      case 'today-tasks':
        renderTasks(true);
        break;
      case 'important':
        renderTasks(false, true);
        break;
    }

    if (window.innerWidth <= 768) {
      sidebar.classList.remove('active');
      backdrop.style.display = 'none';
      hamburgerBtn.style.opacity = '1';
      hamburgerBtn.style.pointerEvents = 'auto';
    }
  }
});

// ===== INITIAL LOAD =====
window.onload = () => {
  const currentUser = JSON.parse(localStorage.getItem('taskflow-current-user'));

  if (currentUser) {
    mainApp.style.display = 'block';
    authSection.style.display = 'none';
  } else {
    mainApp.style.display = 'none';
    authSection.style.display = 'block';
  }

  renderTasks();
};
