// ========== DOM Elements ==========
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");
const statusBadge = document.getElementById("statusBadge");
const langIndicator = document.getElementById("langIndicator");
const chips = document.querySelectorAll(".chip");
const micBtn = document.getElementById("micBtn");
const autoSpeakToggle = document.getElementById("autoSpeakToggle");
const inputHint = document.querySelector(".input-hint");

// ========== State ==========
let conversationHistory = [];
let isProcessing = false;
let isRecording = false;
let autoSpeak = true;
let recognition = null;

// ========== Speech Recognition Setup ==========
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Default to English, switch on the fly
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add("recording");
        micBtn.title = "Listening... Click to stop";
        statusBadge.textContent = "● Listening...";
        statusBadge.className = "status-badge thinking";
    };

    recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Show real-time transcription in the textarea
        messageInput.value = finalTranscript || interimTranscript;
        autoResizeTextarea();
        updateSendButton();

        // Auto-detect language from transcript
        const detectedLang = detectLanguage(finalTranscript || interimTranscript);
        if (detectedLang === "hi") {
            recognition.lang = "hi-IN";
        }
        updateLangIndicator(detectedLang);
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove("recording");
        micBtn.title = "Click to speak";
        statusBadge.textContent = "● Online";
        statusBadge.className = "status-badge";

        // Auto-send if we have transcribed text
        const text = messageInput.value.trim();
        if (text) {
            sendMessage(text);
        }
    };

    recognition.onerror = (event) => {
        isRecording = false;
        micBtn.classList.remove("recording");
        micBtn.title = "Click to speak";
        statusBadge.textContent = "● Online";
        statusBadge.className = "status-badge";

        if (event.error === "no-speech") {
            // Silently ignore — user just didn't speak
        } else if (event.error === "not-allowed") {
            addErrorMessage("Microphone access denied. Please allow microphone permission and try again.");
        } else {
            console.warn("Speech recognition error:", event.error);
        }
    };
} else {
    // Browser doesn't support speech recognition — hide mic button
    if (micBtn) {
        micBtn.classList.add("hidden");
    }
    if (inputHint) {
        inputHint.textContent = "Press Enter to send · Shift+Enter for new line";
    }
}

// ========== Mic Button Click ==========
if (micBtn) {
    micBtn.addEventListener("click", () => {
        if (!recognition) return;

        if (isRecording) {
            recognition.stop();
        } else {
            // Reset to English before starting (will auto-switch if Hindi detected)
            recognition.lang = "en-US";
            messageInput.value = "";
            try {
                recognition.start();
            } catch (e) {
                console.warn("Recognition start error:", e);
            }
        }
    });
}

// ========== Auto-Speak Toggle ==========
if (autoSpeakToggle) {
    autoSpeakToggle.addEventListener("click", () => {
        autoSpeak = !autoSpeak;
        autoSpeakToggle.classList.toggle("active", autoSpeak);
        autoSpeakToggle.classList.toggle("muted", !autoSpeak);
        autoSpeakToggle.title = autoSpeak ? "Auto-speak replies (on)" : "Auto-speak replies (off)";
        if (inputHint) {
            inputHint.textContent = autoSpeak
                ? "Press Enter to send · 🎙️ Click mic to speak · 🔊 Auto-speak is on"
                : "Press Enter to send · 🎙️ Click mic to speak · 🔇 Auto-speak is off";
        }
        // Stop any current speech if turning off
        if (!autoSpeak) {
            window.speechSynthesis.cancel();
        }
    });
}

// ========== Text-to-Speech ==========
function speakText(text, lang) {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown/HTML for clean speech
    const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/<[^>]*>/g, "")
        .replace(/\n/g, ". ")
        .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
    utterance.rate = lang === "hi" ? 1 : 1.3;
    utterance.pitch = lang === "hi" ? 1 : 1.05;
    utterance.volume = 1;

    // Pick a female voice to match the bot's persona
    const voices = window.speechSynthesis.getVoices();
    const targetLang = lang === "hi" ? "hi" : "en";
    const langVoices = voices.filter((v) => v.lang.startsWith(targetLang));

    // Prefer specific female voices for a consistent warm tone
    const preferredNames = lang === "hi"
        ? ["heera", "neerja", "swara", "female"]
        : ["zira", "hazel", "susan", "female"];

    const femaleVoice = langVoices.find((v) => {
        const name = v.name.toLowerCase();
        return preferredNames.some((p) => name.includes(p));
    });

    if (femaleVoice) {
        utterance.voice = femaleVoice;
    } else if (langVoices.length > 0) {
        utterance.voice = langVoices[0];
    }

    window.speechSynthesis.speak(utterance);
    return utterance;
}

// Ensure voices are loaded
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

// ========== Language Detection ==========
function detectLanguage(text) {
    const hindiPattern = /[\u0900-\u097F]/g;
    const hindiMatches = text.match(hindiPattern);
    if (!hindiMatches) return "en";
    // Only return "hi" if majority of the text is in Devanagari script
    const hindiRatio = hindiMatches.length / text.replace(/\s/g, "").length;
    return hindiRatio > 0.3 ? "hi" : "en";
}

let preferredLang = "en";

function updateLangIndicator(lang) {
    preferredLang = lang;
    document.querySelectorAll(".lang-tag").forEach((tag) => {
        tag.classList.toggle("active", tag.dataset.lang === lang);
    });
    // Update speech recognition language
    if (typeof recognition !== "undefined" && recognition) {
        recognition.lang = lang === "hi" ? "hi-IN" : "en-US";
    }
}

// UI translations
const translations = {
    en: {
        welcomeHeading: "Welcome to Germanium Technologies",
        welcomeText: 'I\'m <strong>GT Assist</strong>, your virtual assistant. How may I help you today?',
        statusOnline: "● Online",
        statusThinking: "● Thinking...",
        clearChat: "🗑️ Clear Chat",
        placeholder: "Type or click 🎙️ to speak...",
        inputHint: "Press Enter to send · 🎙️ Click mic to speak · 🔊 Auto-speak is on",
        inputHintMuted: "Press Enter to send · 🎙️ Click mic to speak · 🔇 Auto-speak is off",
        chips: [
            { msg: "Tell me about Germanium Technologies", label: "🏢 About GTL" },
            { msg: "What services do you offer?", label: "💼 Services" },
            { msg: "How can I contact Germanium Technologies?", label: "📞 Contact Info" },
        ],
    },
    hi: {
        welcomeHeading: "जर्मेनियम टेक्नोलॉजीज में आपका स्वागत है",
        welcomeText: 'मैं <strong>GT Assist</strong> हूँ, आपकी वर्चुअल सहायिका। मैं आज आपकी कैसे मदद कर सकती हूँ?',
        statusOnline: "● ऑनलाइन",
        statusThinking: "● सोच रही हूँ...",
        clearChat: "🗑️ चैट साफ़ करें",
        placeholder: "यहाँ टाइप करें या 🎙️ बोलें...",
        inputHint: "भेजने के लिए Enter दबाएँ · 🎙️ बोलने के लिए माइक दबाएँ · 🔊 ऑटो-स्पीक चालू है",
        inputHintMuted: "भेजने के लिए Enter दबाएँ · 🎙️ बोलने के लिए माइक दबाएँ · 🔇 ऑटो-स्पीक बंद है",
        chips: [
            { msg: "Germanium Technologies के बारे में बताओ", label: "🏢 GTL के बारे में" },
            { msg: "आपकी सेवाएँ क्या हैं?", label: "💼 सेवाएँ" },
            { msg: "Germanium Technologies से कैसे संपर्क करें?", label: "📞 संपर्क जानकारी" },
        ],
    },
};

function switchLanguage(lang) {
    updateLangIndicator(lang);
    const t = translations[lang] || translations.en;

    // Update welcome message if visible
    const welcomeH2 = document.querySelector(".welcome-message h2");
    const welcomeP = document.querySelector(".welcome-message p");
    if (welcomeH2) welcomeH2.textContent = t.welcomeHeading;
    if (welcomeP) welcomeP.innerHTML = t.welcomeText;

    // Update suggestion chips
    const chipsContainer = document.querySelector(".suggestion-chips");
    if (chipsContainer) {
        chipsContainer.innerHTML = t.chips.map(
            c => `<button class="chip" data-msg="${c.msg}">${c.label}</button>`
        ).join("");
        // Rebind chip listeners
        chipsContainer.querySelectorAll(".chip").forEach((chip) => {
            chip.addEventListener("click", () => {
                const msg = chip.dataset.msg;
                messageInput.value = msg;
                updateSendButton();
                sendMessage(msg);
            });
        });
    }

    // Update status badge
    if (!isProcessing) {
        statusBadge.textContent = t.statusOnline;
    }

    // Update clear button
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) clearBtn.innerHTML = t.clearChat;

    // Update placeholder and hint
    messageInput.placeholder = t.placeholder;
    const inputHint = document.querySelector(".input-hint");
    if (inputHint) {
        inputHint.textContent = autoSpeak ? t.inputHint : t.inputHintMuted;
    }
}

// Make lang tags clickable
document.querySelectorAll(".lang-tag").forEach((tag) => {
    tag.style.cursor = "pointer";
    tag.addEventListener("click", () => {
        switchLanguage(tag.dataset.lang);
        messageInput.focus();
    });
});

// ========== Helpers ==========
function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ========== Message Rendering ==========
function formatMessage(text) {
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:13px;">$1</code>')
        .replace(/\n/g, "<br>");

    const paragraphs = formatted.split("<br><br>");
    if (paragraphs.length > 1) {
        formatted = paragraphs.map((p) => `<p>${p}</p>`).join("");
    }

    return formatted;
}



function addMessage(content, role, options = {}) {
    // Remove welcome message if present
    const welcome = document.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const messageEl = document.createElement("div");
    messageEl.className = `message ${role}`;

    const avatar = role === "user" ? "👤" : "🤖";
    const formattedContent = role === "bot" ? formatMessage(content) : content;

    // Detect language for speak button
    const lang = detectLanguage(content);

    // Build message HTML
    let contentHTML = formattedContent;
    if (role === "bot" && window.speechSynthesis) {
        // Clean text for the speak button (escape properly)
        const cleanForAttr = content
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/"/g, "&quot;");
        contentHTML += `<button class="speak-btn" data-text="${cleanForAttr}" data-lang="${lang}" title="Listen to this message">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Listen
        </button>`;
    }

    messageEl.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">${contentHTML}</div>
  `;

    // Bind speak button click
    const speakBtnEl = messageEl.querySelector(".speak-btn");
    if (speakBtnEl) {
        speakBtnEl.addEventListener("click", function () {
            const text = this.dataset.text;
            const btnLang = this.dataset.lang;

            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                document.querySelectorAll(".speak-btn.speaking").forEach((b) => b.classList.remove("speaking"));
                return;
            }

            this.classList.add("speaking");
            const utterance = speakText(text, btnLang);
            if (utterance) {
                utterance.onend = () => this.classList.remove("speaking");
                utterance.onerror = () => this.classList.remove("speaking");
            }
        });
    }

    messagesContainer.appendChild(messageEl);
    scrollToBottom();

    // Auto-speak bot messages
    if (role === "bot" && autoSpeak && !options.silent) {
        speakText(content, lang);
    }
}

function addTypingIndicator() {
    const typing = document.createElement("div");
    typing.className = "message bot";
    typing.id = "typingIndicator";
    typing.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
    messagesContainer.appendChild(typing);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typing = document.getElementById("typingIndicator");
    if (typing) typing.remove();
}

function addErrorMessage(text) {
    const messageEl = document.createElement("div");
    messageEl.className = "message bot error";
    messageEl.innerHTML = `
    <div class="message-avatar">⚠️</div>
    <div class="message-content">${text}</div>
  `;
    messagesContainer.appendChild(messageEl);
    scrollToBottom();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ========== API Communication ==========
async function sendMessage(text) {
    if (!text.trim() || isProcessing) return;

    isProcessing = true;
    sendBtn.classList.remove("active");
    messageInput.disabled = true;

    // Detect language and update indicator
    const lang = detectLanguage(text);
    updateLangIndicator(lang);

    // Show user message
    addMessage(text, "user");
    conversationHistory.push({ role: "user", content: text });

    // Clear input
    messageInput.value = "";
    messageInput.style.height = "auto";

    // Show typing indicator
    addTypingIndicator();
    statusBadge.textContent = "● Thinking...";
    statusBadge.className = "status-badge thinking";

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                history: conversationHistory.slice(0, -1),
            }),
        });

        removeTypingIndicator();

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Server error");
        }

        const data = await response.json();
        const reply = data.reply;

        // Detect response language
        const replyLang = detectLanguage(reply);
        updateLangIndicator(replyLang);

        // Show bot message (with auto-speak)
        addMessage(reply, "bot");
        conversationHistory.push({ role: "assistant", content: reply });

        // Handle auto-created ticket from bot response
        if (data.ticket) {
            addMessage(`Ticket #${data.ticket.id} created: "${escapeHTML(data.ticket.subject)}"`, "bot", { silent: true });
            loadTickets();
        }
    } catch (error) {
        removeTypingIndicator();
        addErrorMessage(error.message || "Failed to get response. Please try again.");
    } finally {
        isProcessing = false;
        messageInput.disabled = false;
        messageInput.focus();
        statusBadge.textContent = "● Online";
        statusBadge.className = "status-badge";
        updateSendButton();
    }
}

// ========== Input Handling ==========
function updateSendButton() {
    const hasText = messageInput.value.trim().length > 0;
    sendBtn.classList.toggle("active", hasText && !isProcessing);
}

function autoResizeTextarea() {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
}

messageInput.addEventListener("input", () => {
    updateSendButton();
    autoResizeTextarea();
});

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(messageInput.value);
    }
});

sendBtn.addEventListener("click", () => {
    sendMessage(messageInput.value);
});

// ========== Suggestion Chips ==========
chips.forEach((chip) => {
    chip.addEventListener("click", () => {
        const msg = chip.dataset.msg;
        messageInput.value = msg;
        updateSendButton();
        sendMessage(msg);
    });
});

// ========== Clear Chat ==========
clearBtn.addEventListener("click", async () => {
    conversationHistory = [];

    // Stop any ongoing speech
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // Clear server-side history
    try {
        await fetch("/api/chats", { method: "DELETE" });
    } catch (e) {
        console.warn("Failed to clear server chats:", e);
    }

    messagesContainer.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-emoji">👋</div>
      <h2>Welcome to Germanium Technologies</h2>
      <p>I'm <strong>GT Assist</strong>, your virtual assistant. How may I help you today?</p>
      <div class="suggestion-chips">
        <button class="chip" data-msg="Tell me about Germanium Technologies">🏢 About GTL</button>
        <button class="chip" data-msg="What services do you offer?">💼 Services</button>
        <button class="chip" data-msg="How can I contact Germanium Technologies?">📞 Contact Info</button>
      </div>
    </div>
  `;
    // Re-bind chip listeners
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const msg = chip.dataset.msg;
            messageInput.value = msg;
            updateSendButton();
            sendMessage(msg);
        });
    });

    // Close sidebar on mobile
    sidebar.classList.remove("open");
    const backdrop = document.querySelector(".sidebar-backdrop");
    if (backdrop) backdrop.classList.remove("active");
});

// ========== Mobile Sidebar ==========
menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    let backdrop = document.querySelector(".sidebar-backdrop");
    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "sidebar-backdrop";
        document.body.appendChild(backdrop);
        backdrop.addEventListener("click", () => {
            sidebar.classList.remove("open");
            backdrop.classList.remove("active");
        });
    }
    backdrop.classList.toggle("active", sidebar.classList.contains("open"));
});

// ========== Sidebar Toggle ==========
const sidebarToggle = document.getElementById("sidebarToggle");
if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        sidebarToggle.textContent = sidebar.classList.contains("collapsed") ? "▶" : "◀";
    });
}

// ========== Ticket Management ==========
const ticketModal = document.getElementById("ticketModal");
const newTicketBtn = document.getElementById("newTicketBtn");
const closeModal = document.getElementById("closeModal");
const ticketForm = document.getElementById("ticketForm");
const ticketsList = document.getElementById("ticketsList");

function openTicketModal() {
    if (ticketModal) ticketModal.classList.remove("hidden");
}

function closeTicketModal() {
    if (ticketModal) ticketModal.classList.add("hidden");
    if (ticketForm) ticketForm.reset();
}

if (newTicketBtn) newTicketBtn.addEventListener("click", openTicketModal);
if (closeModal) closeModal.addEventListener("click", closeTicketModal);

// Close modal on backdrop click
if (ticketModal) {
    const backdrop = ticketModal.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeTicketModal);
}

// Submit ticket form
if (ticketForm) {
    ticketForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const subject = document.getElementById("ticketSubject").value.trim();
        const description = document.getElementById("ticketDescription").value.trim();
        const priority = document.getElementById("ticketPriority").value;

        if (!subject) return;

        try {
            const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject, description, priority }),
            });
            const data = await res.json();
            if (data.ticket) {
                closeTicketModal();
                loadTickets();
                addMessage(`Ticket #${data.ticket.id} created: "${escapeHTML(subject)}"`, "bot", { silent: true });
            }
        } catch (error) {
            console.error("Failed to create ticket:", error);
        }
    });
}

async function loadTickets() {
    if (!ticketsList) return;
    try {
        const res = await fetch("/api/tickets");
        const data = await res.json();
        if (data.tickets && data.tickets.length > 0) {
            ticketsList.innerHTML = data.tickets.map((t) => `
                <div class="ticket-item">
                    <div class="ticket-subject">#${t.id} ${escapeHTML(t.subject)}</div>
                    <div class="ticket-meta">
                        <span class="ticket-status ${t.priority === 'urgent' ? 'urgent' : t.priority === 'high' ? 'high' : t.status}">${escapeHTML(t.status)}</span>
                        <span>${escapeHTML(t.created_at || '')}</span>
                    </div>
                </div>
            `).join("");
        } else {
            ticketsList.innerHTML = '<p class="tickets-empty">No tickets yet</p>';
        }
    } catch (error) {
        console.error("Failed to load tickets:", error);
    }
}

// ========== Page Load: Restore Chat History ==========
async function initApp() {
    try {
        // Identify user
        await fetch("/api/user");

        // Load persistent chat history
        const chatRes = await fetch("/api/chats");
        const chatData = await chatRes.json();

        if (chatData.chats && chatData.chats.length > 0) {
            // Remove welcome message
            messagesContainer.innerHTML = "";
            conversationHistory = [];

            for (const chat of chatData.chats) {
                const role = chat.role === "user" ? "user" : "bot";
                addMessage(chat.content, role, { silent: true });
                conversationHistory.push({
                    role: chat.role === "user" ? "user" : "assistant",
                    content: chat.content,
                });
            }
        }

        // Load tickets
        loadTickets();

        // Track page view
        fetch("/api/analytics/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_type: "page_view" }),
        }).catch(() => { });
    } catch (error) {
        console.warn("Failed to initialize app:", error);
    }
}

// ========== Focus on load ==========
messageInput.focus();
initApp();
