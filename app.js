import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzFeSmmJL0qimEijf6s2EQ37vbTD9A6Kc",
  authDomain: "mars-dff78.firebaseapp.com",
  projectId: "mars-dff78",
  storageBucket: "mars-dff78.firebasestorage.app",
  messagingSenderId: "1051838660221",
  appId: "1:1051838660221:web:009871b8f74082a4017b14"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Элементы UI
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const emailLoginBtn = document.getElementById('email-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userEmailSpan = document.getElementById('user-email');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');
const adminPanel = document.getElementById('admin-panel');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const modeBanner = document.getElementById('mode-banner');

let currentMode = "public"; // По умолчанию общий
let currentUser = null;

// Укажите ваш Email Создателя
const ADMIN_EMAIL = "neji@hyuga.com";

// Авторизация
emailLoginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return alert("Введите email и пароль!");
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// Следим за пользователем
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        userEmailSpan.textContent = user.email;

        // Показываем панель только вам!
        if (user.email === ADMIN_EMAIL) {
            adminPanel.classList.remove('hidden');
        } else {
            adminPanel.classList.add('hidden');
        }

        listenToSettings();
    } else {
        authContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
    }
});

// Слушаем режим сайта от администратора
function listenToSettings() {
    onSnapshot(doc(db, "system", "settings"), (docSnap) => {
        if (docSnap.exists()) {
            currentMode = docSnap.data().mode || "public";
        } else {
            currentMode = "public";
        }
        updateUI();
        loadMessages();
    });
}

// Переключение режима Создателем
toggleModeBtn.addEventListener('click', async () => {
    const newMode = currentMode === "public" ? "private" : "public";
    await setDoc(doc(db, "system", "settings"), { mode: newMode });
});

function updateUI() {
    if (currentMode === "public") {
        modeBanner.textContent = "📢 Включен ОБЩИЙ ЧАТ (все видят сообщения)";
        modeBanner.className = "mode-banner mode-public";
    } else {
        modeBanner.textContent = "🔒 Включены ЛИЧНЫЕ ЗАМЕТКИ (никто не видит чужие записи)";
        modeBanner.className = "mode-banner mode-private";
    }
}

// Отправка сообщений
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentUser) return;

    await addDoc(collection(db, "messages"), {
        text: text,
        email: currentUser.email,
        mode: currentMode, // Записываем, в каком режиме отправлено
        createdAt: serverTimestamp()
    });
    messageInput.value = '';
});

// Загрузка сообщений с фильтрацией
function loadMessages() {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Фильтрация:
            // 1. В общем режиме показываем сообщения общего режима
            // 2. В личном режиме показываем ТОЛЬКО личные сообщения текущего пользователя
            const isPublicMsg = currentMode === "public" && data.mode === "public";
            const isMyPrivateMsg = currentMode === "private" && data.mode === "private" && data.email === currentUser.email;

            if (isPublicMsg || isMyPrivateMsg) {
                const msgDiv = document.createElement('div');
                msgDiv.classList.add('msg');
                msgDiv.innerHTML = `<span class="msg-author">${data.email}</span>${data.text}`;
                messagesContainer.appendChild(msgDiv);
            }
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}