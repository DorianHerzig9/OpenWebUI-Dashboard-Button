// ==UserScript==
// @name         Open WebUI Chat Download Button
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Fügt einen Button zum Dashboard von Open WebUI hinzu, der KI-Outputs ausliest und herunterlädt
// @description  14.2.2025, 22:14:28
// @author       Dorian Herzig
// @match        http://localhost:3000/*
// @match        http://localhost:8080/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// ==/UserScript==

(async function() {
    'use strict';

    async function fetchChatData(guid) {
        const url = window.location.origin + "/api/v1/chats/" + guid;
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const messages = Array.isArray(data?.chat?.history?.messages)
                ? data.chat.history.messages
                : Object.values(data?.chat?.history?.messages || {});

            const assistantMessages = messages
                .filter(msg => msg?.role === 'assistant' && typeof msg?.content === 'string')
                .map(msg => msg.content);

            const conversationTitle = data?.chat?.title || 'ki_outputs';
            handleAction(assistantMessages, conversationTitle);
        } catch (error) {
            console.error('Fehler beim Abrufen der Chat-Daten:', error);
            alert('Fehler beim Abrufen der Chat-Daten');
        }
    }

    function handleAction(assistantMessages, conversationTitle) {
        const action = prompt("Möchtest du die KI-Outputs herunterladen (=d) oder in die Zwischenablage kopieren (=c)? (d/c)");

        if (action === 'd') {
            downloadAsZip(assistantMessages, conversationTitle);
        } else if (action === 'c') {
            copyToClipboard(assistantMessages);
        } else {
            alert('Ungültige Auswahl!');
        }
    }

    async function downloadAsZip(assistantMessages, conversationTitle) {
        const zip = new JSZip();
        assistantMessages.forEach((content, index) => {
            zip.file(`response_${index + 1}.txt`, content);
        });

        const allMessages = assistantMessages.join('\n\n');
        zip.file('all_responses.txt', allMessages);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const urlBlob = URL.createObjectURL(zipBlob);

        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = `${conversationTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
        a.click();

        URL.revokeObjectURL(urlBlob);
    }

    async function copyToClipboard(assistantMessages) {
        const allMessages = assistantMessages.join('\n\n');
        await navigator.clipboard.writeText(allMessages);
        alert('KI-Outputs wurden in die Zwischenablage kopiert!');
    }

    function buildDownloadButton() {
        const button = document.createElement('button');
        button.id = 'customButton';
        button.textContent = '📥 KI Outputs';
        button.style.color = '#c8cdcd';
        button.style.fontSize = '.875rem';
        button.style.border = 'none';
        button.style.borderRadius = '90px';
        button.style.cursor = 'pointer';
        button.style.padding = '4px 10px';
        button.style.transition = 'background 0.3s ease';

        button.addEventListener('mouseover', () => {
            button.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        });

        button.addEventListener('mouseout', () => {
            button.style.background = 'none';
        });

        button.addEventListener('click', async () => {
            const guid = window.location.pathname.split("/").pop();
            await fetchChatData(guid);
        });

        return button;
    }

    function placeButton() {
        const div = document.querySelector(".flex.gap-0\\.5.items-center.overflow-x-auto.scrollbar-none.flex-1");
        if (div && !document.getElementById('customButton')) {
            const downloadButton = buildDownloadButton();
            div.appendChild(downloadButton);
        }
    }

    function main() {
        placeButton();
        setInterval(placeButton, 100);
    }

    main();
})();