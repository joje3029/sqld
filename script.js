let currentQuestions = [];
let currentQuestionIndex = 0;
let currentRound = '';
let score = 0;
let selectedAnswer = null;

async function loadMarkdown() {
    try {
        const response = await fetch('note.md');
        const text = await response.text();
        return text;
    } catch (error) {
        console.error('마크다운 파일을 불러오는데 실패했습니다:', error);
        return null;
    }
}

function parseMarkdown(markdown) {
    const questions = [];
    const sections = markdown.split('### 문제');
    
    sections.slice(1).forEach((section, index) => {
        const lines = section.trim().split('\n');
        let questionText = '';
        let answer = '';
        let explanation = '';
        
        // 문제 내용 추출
        let currentBlock = [];
        let isCodeBlock = false;
        let isQuestionContent = true;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('정답:')) {
                isQuestionContent = false;
                answer = line.replace('정답:', '').trim();
                continue;
            }
            
            if (line.startsWith('해설:')) {
                isQuestionContent = false;
                // 해설 다음 줄부터 다음 문제 시작 전까지가 해설 내용
                let j = i + 1;
                while (j < lines.length && !lines[j].trim().startsWith('---')) {
                    explanation += lines[j] + '\n';
                    j++;
                }
                explanation = explanation.trim();
                break;
            }
            
            if (isQuestionContent && line !== '---') {
                if (line.startsWith('```')) {
                    isCodeBlock = !isCodeBlock;
                    if (isCodeBlock) {
                        currentBlock.push('<pre><code>');
                    } else {
                        currentBlock.push('</code></pre>');
                    }
                } else if (line.startsWith('|')) {
                    // 테이블 처리
                    currentBlock.push(line);
                } else {
                    if (line) currentBlock.push(line);
                }
            }
        }
        
        questionText = currentBlock.join('\n').trim();
        
        if (questionText || answer) {
            questions.push({
                id: index + 1,
                question: questionText || '문제 내용이 없습니다.',
                answer: answer || '정답이 없습니다.',
                explanation: explanation || '',
                isAnswered: false,
                isCorrect: false
            });
        }
    });
    
    return questions;
}

function createQuestionElement(question) {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.id = `question-${question.id}`;
    
    let questionContent = question.question;
    
    // 테이블 변환
    if (questionContent.includes('|')) {
        const lines = questionContent.split('\n');
        const tableLines = lines.filter(line => line.trim().startsWith('|'));
        if (tableLines.length > 0) {
            const tableHtml = `<table>${
                tableLines.map(line => {
                    const cells = line.split('|').filter(cell => cell.trim());
                    return `<tr>${cells.map(cell => `<td>${cell.trim()}</td>`).join('')}</tr>`;
                }).join('')
            }</table>`;
            questionContent = questionContent.replace(tableLines.join('\n'), tableHtml);
        }
    }
    
    div.innerHTML = `
        <div class="question-header">
            <span class="question-number">문제 ${question.id}</span>
        </div>
        <div class="question-content">${questionContent}</div>
        <div class="answer-section">
            <input type="text" class="answer-input" placeholder="답을 입력하세요">
            <button class="check-answer-btn" onclick="checkAnswer(${question.id})">정답 확인</button>
        </div>
        <div class="result"></div>
        <div class="explanation">${question.explanation || ''}</div>
    `;
    
    return div;
}

function checkAnswer(questionId) {
    const questionDiv = document.getElementById(`question-${questionId}`);
    const input = questionDiv.querySelector('.answer-input');
    const resultDiv = questionDiv.querySelector('.result');
    const explanationDiv = questionDiv.querySelector('.explanation');
    const question = currentQuestions.find(q => q.id === questionId);
    
    if (!question) return;
    
    const userAnswer = input.value.trim();
    const isCorrect = question.answer.toLowerCase().includes(userAnswer.toLowerCase());
    
    resultDiv.textContent = isCorrect ? '정답입니다!' : '틀렸습니다.';
    resultDiv.textContent += ` (정답: ${question.answer})`;
    resultDiv.className = `result ${isCorrect ? 'correct' : 'incorrect'}`;
    resultDiv.style.display = 'block';
    
    if (question.explanation) {
        explanationDiv.style.display = 'block';
    }
    
    if (!question.isAnswered) {
        question.isAnswered = true;
        question.isCorrect = isCorrect;
        updateScore();
    }
}

function updateScore() {
    const total = currentQuestions.length;
    const answered = currentQuestions.filter(q => q.isAnswered).length;
    const correct = currentQuestions.filter(q => q.isCorrect).length;
    
    document.getElementById('answered-count').textContent = answered;
    document.getElementById('total-count').textContent = total;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('answered-count2').textContent = answered;
}

let questions = [];

async function init() {
    const markdown = await loadMarkdown();
    if (!markdown) return;
    
    currentQuestions = parseMarkdown(markdown);
    const questionList = document.getElementById('question-list');
    
    currentQuestions.forEach(question => {
        questionList.appendChild(createQuestionElement(question));
    });
    
    updateScore();
}

init();

function updateQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    document.getElementById('question-number').textContent = `${currentQuestionIndex + 1}/${currentQuestions.length}`;
    document.getElementById('score').textContent = `점수: ${score}`;
    document.getElementById('question-content').textContent = question.question;
    document.getElementById('result').classList.add('hidden');
    document.getElementById('submit-btn').disabled = false;
    selectedAnswer = null;
    
    // 선택된 답안 초기화
    document.querySelectorAll('.options button').forEach(btn => {
        btn.style.backgroundColor = '#3498db';
    });
}

function selectAnswer(number) {
    selectedAnswer = number;
    document.querySelectorAll('.options button').forEach(btn => {
        btn.style.backgroundColor = '#3498db';
    });
    document.querySelector(`.options button:nth-child(${number})`).style.backgroundColor = '#2980b9';
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        updateQuestion();
    } else {
        alert(`퀴즈가 끝났습니다!\n최종 점수: ${score}/${currentQuestions.length}`);
        showRoundSelection();
    }
}

function showRoundSelection() {
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('round-selection').classList.remove('hidden');
} 