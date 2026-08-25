function initLab() {
    fetchDatabaseState();
    fetchLogs();
    setInterval(fetchLogs, 2000);
}

function toggleHint(hintId) {
    const hintBox = document.getElementById(hintId);
    hintBox.style.display = hintBox.style.display === 'block' ? 'none' : 'block';
}

async function autoReset() {
    try {
        await fetch('/api/database/reset', { method: 'POST' });
        fetchDatabaseState();
        
        await fetch('/api/events/clear', { method: 'POST' });
        fetchLogs();

        document.getElementById('query-output').innerText = "Waiting for commands...";
        document.getElementById('response-output').innerText = "Environment automatically reset for new scenario.";
    } catch (error) {
        console.error("Auto-reset error:", error);
    }
}

function openTab(evt, tabId) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) tabContents[i].style.display = "none";
    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) tabBtns[i].className = tabBtns[i].className.replace(" active", "");
    
    document.getElementById(tabId).style.display = "block";
    evt.currentTarget.className += " active";

    const resetBtn = document.getElementById('reset-btn-ui');
    resetBtn.style.display = tabId === 'tab-update' ? 'inline-block' : 'none';
    document.querySelectorAll('.hint-box').forEach(box => box.style.display = 'none');

    autoReset();
}

async function attemptLogin() {
    const email = document.getElementById('email').value;
    const parola = document.getElementById('password').value;
    const difficulty = document.getElementById('diff-login').value;
    executeRequest('/api/attack/login', { email, parola, difficulty });
}

async function attemptSearch() {
    const roomName = document.getElementById('roomName').value;
    const difficulty = document.getElementById('diff-union').value;
    executeRequest('/api/attack/search', { roomName, difficulty });
}

async function attemptUpdate() {
    const targetEmail = document.getElementById('targetEmail').value;
    const newPassword = document.getElementById('newPassword').value;
    const difficulty = document.getElementById('diff-update').value;
    await executeRequest('/api/attack/update', { targetEmail, newPassword, difficulty });
    fetchDatabaseState();
}

async function attemptBlind() {
    const roomNumber = document.getElementById('roomNumber').value;
    const difficulty = document.getElementById('diff-blind').value;
    
    try {
        const response = await fetch('/api/attack/blind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomNumber, difficulty })
        });
        const data = await response.json();
        
        const queryDiv = document.getElementById('query-output');
        queryDiv.innerText = data.executedQuery;

        const responseDiv = document.getElementById('response-output');
        if (data.isWafBlock) {
            responseDiv.innerHTML = `<span class="waf-text">${data.message}</span>`;
        } else if (data.exists) {
            responseDiv.innerHTML = `<span class="success-text">BINARY RESULT (TRUE):</span> The system says the room exists.`;
        } else {
            responseDiv.innerHTML = `<span class="highlight">BINARY RESULT (FALSE):</span> The system says the room DOES NOT exist.`;
        }
        fetchLogs(); 
    } catch (error) {
        console.error("Error:", error);
    }
}

async function executeRequest(url, bodyData) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        const data = await response.json();
        
        const queryDiv = document.getElementById('query-output');
        queryDiv.innerText = data.executedQuery;

        const responseDiv = document.getElementById('response-output');
        
        if (data.isWafBlock) {
            responseDiv.innerHTML = `<span class="waf-text">${data.message}</span>`;
        } else if(data.success) {
            if(data.affectedRows !== undefined) {
                if (data.affectedRows > 0) {
                    responseDiv.innerHTML = `<span class="highlight">ATTACK SUCCESS:</span> Modified <b>${data.affectedRows}</b> rows in the database!`;
                } else {
                    responseDiv.innerHTML = `<span class="success-text">ATTACK NEUTRALIZED (SECURE):</span> No rows were modified! (0 affected rows)`;
                }
            } else {
                responseDiv.innerHTML = `<span class="success-text">SUCCESS!</span>\n\nExtracted Data:\n` + JSON.stringify(data.user || data.results, null, 2);
            }
        } else {
            responseDiv.innerHTML = `<span class="highlight">FAILURE / SECURE:</span> ${data.message || data.error}`;
        }
        fetchLogs(); 
    } catch (error) {
        console.error("Error:", error);
    }
}

async function fetchDatabaseState() {
    try {
        const response = await fetch('/api/database/state');
        const data = await response.json();
        if(data.success && data.data.length > 0) {
            let tableHTML = `<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th></tr>`;
            data.data.forEach(row => {
                tableHTML += `<tr><td>${row.id}</td><td>${row.nume}</td><td>${row.email}</td><td><b style="color:#ff4c4c">${row.parola}</b></td></tr>`;
            });
            tableHTML += `</table>`;
            document.getElementById('database-table-container').innerHTML = tableHTML;
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function fetchLogs() {
    try {
        const response = await fetch('/api/events');
        const data = await response.json();
        if(data.success) {
            const logContainer = document.getElementById('security-logs');
            logContainer.innerHTML = '';
            if (data.logs.length === 0) {
                logContainer.innerHTML = 'No activity recorded yet...';
                return;
            }
            data.logs.forEach(log => {
                const div = document.createElement('div');
                div.innerText = log;
                if(log.includes('[🚨 ALERT]')) div.className = 'log-alert';
                logContainer.appendChild(div);
            });
        }
    } catch (error) {
        console.error("Error fetching logs:", error);
    }
}

async function resetDatabase() {
    try {
        const response = await fetch('/api/database/reset', { method: 'POST' });
        const data = await response.json();
        if(data.success) {
            alert("Success: " + data.message);
            fetchDatabaseState(); 
            fetchLogs();
            document.getElementById('query-output').innerText = "Waiting for commands...";
            document.getElementById('response-output').innerText = "Laboratory has been reset.";
        }
    } catch (error) {
        console.error("Reset error:", error);
        alert("An error occurred while resetting the database.");
    }
}