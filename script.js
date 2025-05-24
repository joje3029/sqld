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
    
    sections.slice(1).forEach(section => {
        const lines = section.split('\n');
        const questionText = lines[0].trim();
        
        let answer = '';
        let explanation = '';
        
        const answerIndex = lines.findIndex(line => line.trim().startsWith('정답:'));
        if (answerIndex !== -1) {
            answer = lines[answerIndex].split('정답:')[1].trim();
        }
        
        const explanationIndex = lines.findIndex(line => line.trim().startsWith('해설:'));
        if (explanationIndex !== -1) {
            explanation = lines.slice(explanationIndex + 1)
                .filter(line => line.trim() && !line.startsWith('---'))
                .join('\n')
                .trim();
        }
        
        questions.push({
            question: questionText,
            answer,
            explanation
        });
    });
    
    return questions;
}

async function loadQuestions(round) {
    const markdown = await loadMarkdown();
    if (!markdown) return;

    const allQuestions = parseMarkdown(markdown);
    currentQuestions = allQuestions.filter(q => q.question.includes(`${round}회`));
    currentRound = round;
    currentQuestionIndex = 0;
    score = 0;
    
    document.getElementById('round-selection').classList.add('hidden');
    document.getElementById('quiz-section').classList.remove('hidden');
    document.getElementById('current-round').textContent = `${round}회`;
    updateQuestion();
}

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

function checkAnswer() {
    if (selectedAnswer === null) {
        alert('답을 선택해주세요!');
        return;
    }

    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = question.answer.includes(selectedAnswer.toString());
    
    const resultDiv = document.getElementById('result');
    const answerResultDiv = document.getElementById('answer-result');
    const explanationDiv = document.getElementById('explanation');
    
    resultDiv.classList.remove('hidden', 'correct', 'incorrect');
    resultDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
    
    answerResultDiv.textContent = isCorrect ? '정답입니다!' : '틀렸습니다.';
    answerResultDiv.textContent += ` (정답: ${question.answer})`;
    
    if (question.explanation) {
        explanationDiv.textContent = question.explanation;
        explanationDiv.style.display = 'block';
    } else {
        explanationDiv.style.display = 'none';
    }
    
    if (isCorrect) score++;
    document.getElementById('score').textContent = `점수: ${score}`;
    document.getElementById('submit-btn').disabled = true;
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