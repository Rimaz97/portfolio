// ===== Конфигурация =====
const ADMIN_PASSWORD = "admin123";
const STORAGE_KEY = "portfolio_projects";

// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyAMLNUXgsFtPIXxGytOM5UNiiC4Ib0xG6k",
  authDomain: "portfolio-rimaz.firebaseapp.com",
  projectId: "portfolio-rimaz",
  storageBucket: "portfolio-rimaz.firebasestorage.app",
  messagingSenderId: "98840858134",
  appId: "1:98840858134:web:f6ca2617ddec5bb1166f37",
  measurementId: "G-45GDV2E73V",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const PROJECTS_COLLECTION = "projects";

// ===== Данные =====
let projects = [];
let currentSlide = 0;
let isAdmin = false;
let isLoading = true;

// ===== DOM-элементы =====
const track = document.getElementById("carouselTrack");
const indicators = document.getElementById("indicators");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const addBtn = document.getElementById("openAddModalBtn");
const authToggleBtn = document.getElementById("authToggleBtn");

const projectModal = document.getElementById("projectModal");
const projectModalTitle = document.getElementById("projectModalTitle");
const projectSubmitBtn = document.getElementById("projectSubmitBtn");
const closeProjectModalBtn = document.getElementById("closeProjectModalBtn");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const projectForm = document.getElementById("projectForm");
const editProjectId = document.getElementById("editProjectId");

const loginModal = document.getElementById("loginModal");
const closeLogin = document.getElementById("closeLoginModalBtn");
const cancelLogin = document.getElementById("cancelLoginBtn");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

// ===== Загрузка / сохранение (Firebase) =====
async function loadProjects() {
  try {
    const docRef = db.collection(PROJECTS_COLLECTION).doc("main");
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      projects = data.projects || [];
      if (projects.length === 0) {
        projects = getDefaultProjects();
        await saveProjects();
      }
    } else {
      projects = getDefaultProjects();
      await saveProjects();
    }
  } catch (error) {
    console.error("Ошибка загрузки из Firebase:", error);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        projects = JSON.parse(stored);
      } catch {
        projects = getDefaultProjects();
      }
    } else {
      projects = getDefaultProjects();
    }
  }
  isLoading = false;
  renderCarousel();
  if (projects.length > 0) goToSlide(0);
}

async function saveProjects() {
  try {
    await db.collection(PROJECTS_COLLECTION).doc("main").set({ projects });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Ошибка сохранения в Firebase:", error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    alert("Не удалось сохранить в облако, но данные сохранены локально.");
  }
}

function getDefaultProjects() {
  return [
    {
      id: Date.now() + 1,
      title: "Todo-приложение",
      description:
        "Классический менеджер задач с добавлением, удалением и отметкой выполненных.",
      tech: ["JavaScript", "CSS", "HTML"],
      image: "https://via.placeholder.com/400x200/2a2a4a/e8c85a?text=Todo+App",
      link: "#",
      repo: "#",
    },
    {
      id: Date.now() + 2,
      title: "Погодный виджет",
      description:
        "Виджет показывает текущую погоду по геолокации. Данные с открытого API.",
      tech: ["React", "Axios", "CSS"],
      image: "https://via.placeholder.com/400x200/2a2a4a/e8c85a?text=Weather",
      link: "#",
      repo: "#",
    },
    {
      id: Date.now() + 3,
      title: "Блог на Node.js",
      description:
        "Полноценный блог с авторизацией, постами, комментариями. База MongoDB.",
      tech: ["Node.js", "Express", "MongoDB", "EJS"],
      image: "https://via.placeholder.com/400x200/2a2a4a/e8c85a?text=Blog",
      link: "#",
      repo: "#",
    },
  ];
}

// ===== Рендер карусели =====
function renderCarousel() {
  if (isLoading) {
    track.innerHTML = `<p style="padding: 40px; text-align: center; color: #6a6a8a; width: 100%;">Загрузка проектов...</p>`;
    indicators.innerHTML = "";
    return;
  }
  if (!track) return;
  if (projects.length === 0) {
    track.innerHTML = `<p style="padding: 40px; text-align: center; color: #6a6a8a; width: 100%;">Пока нет проектов. Добавьте первый!</p>`;
    indicators.innerHTML = "";
    return;
  }

  track.innerHTML = projects
    .map(
      (project) => `
        <div class="project-card" data-id="${project.id}">
            <img src="${project.image || "https://via.placeholder.com/400x200/2a2a4a/e8c85a?text=Без+изображения"}" alt="${project.title}">
            <div class="card-body">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="tech">
                    ${(project.tech || []).map((t) => `<span>${t.trim()}</span>`).join("")}
                </div>
                <div class="project-links">
                    ${project.link && project.link !== "#" ? `<a href="${project.link}" target="_blank">🔗 Демо</a>` : ""}
                    ${project.repo && project.repo !== "#" ? `<a href="${project.repo}" target="_blank">📂 Репозиторий</a>` : ""}
                </div>
                ${
                  isAdmin
                    ? `
                    <div class="admin-actions">
                        <button class="edit-btn" data-id="${project.id}">✏️ Редактировать</button>
                        <button class="delete-btn" data-id="${project.id}">🗑 Удалить</button>
                    </div>
                `
                    : ""
                }
            </div>
        </div>
    `,
    )
    .join("");

  if (isAdmin) {
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async function (e) {
        const id = Number(this.dataset.id);
        if (confirm("Удалить проект?")) {
          projects = projects.filter((p) => p.id !== id);
          await saveProjects();
          renderCarousel();
          updateIndicators();
          goToSlide(currentSlide);
        }
      });
    });
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        const id = Number(this.dataset.id);
        openEditModal(id);
      });
    });
  }

  updateIndicators();
  const maxSlide = Math.max(0, projects.length - getCardsPerView());
  if (currentSlide > maxSlide) currentSlide = maxSlide;
  goToSlide(currentSlide);
}

function getCardsPerView() {
  if (window.innerWidth <= 650) return 1;
  if (window.innerWidth <= 900) return 2;
  return 3;
}

function updateIndicators() {
  const total = projects.length;
  const perView = getCardsPerView();
  const count = Math.max(1, Math.ceil(total / perView));
  indicators.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.dataset.index = i;
    if (i === currentSlide) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(i));
    indicators.appendChild(dot);
  }
}

function goToSlide(index) {
  const total = projects.length;
  if (total === 0) return;
  const perView = getCardsPerView();
  const maxSlide = Math.max(0, Math.ceil(total / perView) - 1);
  if (index < 0) index = 0;
  if (index > maxSlide) index = maxSlide;
  currentSlide = index;

  const cardWidth = track.querySelector(".project-card")?.offsetWidth || 0;
  const gap = 25;
  const offset = index * (cardWidth + gap) * perView;
  track.style.transform = `translateX(-${offset}px)`;

  document.querySelectorAll(".carousel-indicators span").forEach((dot, i) => {
    dot.classList.toggle("active", i === currentSlide);
  });
}

function nextSlide() {
  const total = projects.length;
  if (total === 0) return;
  const perView = getCardsPerView();
  const maxSlide = Math.max(0, Math.ceil(total / perView) - 1);
  if (currentSlide < maxSlide) goToSlide(currentSlide + 1);
}

function prevSlide() {
  if (currentSlide > 0) goToSlide(currentSlide - 1);
}

function openEditModal(id) {
  const project = projects.find((p) => p.id === id);
  if (!project) return;
  document.getElementById("projectTitle").value = project.title;
  document.getElementById("projectDescription").value = project.description;
  document.getElementById("projectTech").value = (project.tech || []).join(
    ", ",
  );
  document.getElementById("projectImage").value = project.image || "";
  document.getElementById("projectLink").value = project.link || "";
  document.getElementById("projectRepo").value = project.repo || "";
  editProjectId.value = project.id;
  projectModalTitle.textContent = "Редактировать проект";
  projectSubmitBtn.textContent = "💾 Сохранить";
  projectModal.classList.add("active");
}

function openAddModal() {
  projectForm.reset();
  editProjectId.value = "";
  projectModalTitle.textContent = "Новый проект";
  projectSubmitBtn.textContent = "➕ Добавить";
  projectModal.classList.add("active");
}

function closeProjectModal() {
  projectModal.classList.remove("active");
}

async function saveProjectFromForm() {
  const title = document.getElementById("projectTitle").value.trim();
  const description = document
    .getElementById("projectDescription")
    .value.trim();
  const tech = document.getElementById("projectTech").value.trim();
  const image = document.getElementById("projectImage").value.trim();
  const link = document.getElementById("projectLink").value.trim();
  const repo = document.getElementById("projectRepo").value.trim();

  if (!title || !description) {
    alert("Заполните название и описание.");
    return;
  }

  const id = editProjectId.value ? Number(editProjectId.value) : null;
  const projectData = {
    title,
    description,
    tech: tech
      ? tech
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    image: image || "",
    link: link || "#",
    repo: repo || "#",
  };

  if (id) {
    const index = projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...projectData };
    }
  } else {
    const newProject = { id: Date.now(), ...projectData };
    projects.push(newProject);
  }

  await saveProjects();
  renderCarousel();
  if (!id) {
    const perView = getCardsPerView();
    const maxSlide = Math.max(0, Math.ceil(projects.length / perView) - 1);
    goToSlide(maxSlide);
  } else {
    goToSlide(currentSlide);
  }
  closeProjectModal();
}

function checkAuth() {
  const session = sessionStorage.getItem("portfolio_admin");
  if (session === "true") {
    isAdmin = true;
    authToggleBtn.textContent = "Выйти";
    addBtn.classList.remove("hidden");
  } else {
    isAdmin = false;
    authToggleBtn.textContent = "Войти";
    addBtn.classList.add("hidden");
  }
  renderCarousel();
}

function login(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem("portfolio_admin", "true");
    checkAuth();
    loginModal.classList.remove("active");
    loginError.textContent = "";
    loginForm.reset();
    return true;
  } else {
    loginError.textContent = "Неверный пароль";
    return false;
  }
}

function logout() {
  sessionStorage.removeItem("portfolio_admin");
  checkAuth();
}

// ===== Обработчики событий =====
authToggleBtn.addEventListener("click", function () {
  if (isAdmin) {
    logout();
  } else {
    loginModal.classList.add("active");
    loginError.textContent = "";
    loginForm.reset();
  }
});

closeLogin.addEventListener("click", () =>
  loginModal.classList.remove("active"),
);
cancelLogin.addEventListener("click", () =>
  loginModal.classList.remove("active"),
);
closeProjectModalBtn.addEventListener("click", closeProjectModal);
cancelProjectBtn.addEventListener("click", closeProjectModal);
addBtn.addEventListener("click", openAddModal);

window.addEventListener("click", function (e) {
  if (e.target === loginModal) loginModal.classList.remove("active");
  if (e.target === projectModal) closeProjectModal();
});

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const pass = document.getElementById("passwordInput").value;
  login(pass);
});

projectForm.addEventListener("submit", function (e) {
  e.preventDefault();
  saveProjectFromForm();
});

prevBtn.addEventListener("click", prevSlide);
nextBtn.addEventListener("click", nextSlide);

let resizeTimer;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderCarousel();
  }, 300);
});

async function init() {
  await loadProjects();
  checkAuth();
}

init();

document
  .getElementById("passwordInput")
  .addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      loginForm.dispatchEvent(new Event("submit"));
    }
  });
