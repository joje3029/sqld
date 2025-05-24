// 상수 정의
const QUESTION_STATUS = {
    CONTENT: 'content',
    OPTIONS: 'options',
    ANSWER: 'answer',
    EXPLANATION: 'explanation'
};

const DEFAULT_OPTIONS = [
    '보기 1', '보기 2', '보기 3', '보기 4'
];

// 전역 상태 관리
const state = {
    questions: [],
    answeredCount: 0,
    correctCount: 0
};

// 초기화 및 이벤트 리스너
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        await loadQuestions();
        renderQuestions();
        updateProgress();
    } catch (error) {
        console.error('앱 초기화 중 오류 발생:', error);
    }
}

// 문제 로딩 및 파싱
async function loadQuestions() {
    try {
        const response = await fetch('note.md');
        const text = await response.text();
        state.questions = parseQuestions(text);
    } catch (error) {
        console.error('문제를 불러오는데 실패했습니다:', error);
    }
}

function parseQuestions(markdown) {
    const sections = markdown.split('### 문제');
    return sections.slice(1)
        .map(parseQuestion)
        .filter(Boolean)
        .sort((a, b) => a.number - b.number);
}

function parseQuestion(section) {
    const lines = section.trim().split('\n');
    const questionNumber = parseInt(lines[0].trim());
    
    if (isNaN(questionNumber)) {
        console.error('문제 번호를 찾을 수 없습니다:', lines[0]);
        return null;
    }
    
    const parsedContent = parseQuestionContent(lines.slice(1));
    
    return {
        number: questionNumber,
        ...parsedContent,
        answered: false,
        isCorrect: false
    };
}

function parseQuestionContent(lines) {
    const content = {
        text: '',
        options: [],
        correctAnswer: '',
        explanation: ''
    };
    
    let currentStatus = QUESTION_STATUS.CONTENT;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === '---') continue;
        
        currentStatus = updateParsingStatus(trimmedLine, currentStatus);
        updateContent(content, trimmedLine, currentStatus);
    }
    
    if (content.options.length === 0) {
        content.options = [...DEFAULT_OPTIONS];
    }
    
    return {
        text: content.text.trim(),
        options: content.options.slice(0, 4),
        correctAnswer: content.correctAnswer || '1',
        explanation: content.explanation.trim()
    };
}

function updateParsingStatus(line, currentStatus) {
    if (line.match(/^\d\)/)) return QUESTION_STATUS.OPTIONS;
    if (line.startsWith('정답:')) return QUESTION_STATUS.ANSWER;
    if (line.startsWith('해설:')) return QUESTION_STATUS.EXPLANATION;
    return currentStatus;
}

function updateContent(content, line, status) {
    switch (status) {
        case QUESTION_STATUS.CONTENT:
            content.text += line + '\n';
            break;
        case QUESTION_STATUS.OPTIONS:
            if (line.match(/^\d\)/)) {
                content.options.push(line.substring(line.indexOf(')') + 1).trim());
            }
            break;
        case QUESTION_STATUS.ANSWER:
            if (line.startsWith('정답:')) {
                content.correctAnswer = parseAnswer(line.replace('정답:', '').trim());
            }
            break;
        case QUESTION_STATUS.EXPLANATION:
            content.explanation += (line.startsWith('해설:') ? 
                line.replace('해설:', '').trim() : line) + '\n';
            break;
    }
}

function parseAnswer(answerText) {
    const match = answerText.match(/\d+/);
    return match ? match[0] : '1';
}

// UI 렌더링
function renderQuestions() {
    const questionList = document.getElementById('question-list');
    const template = document.getElementById('question-template');
    
    state.questions.forEach(question => {
        const questionElement = createQuestionElement(question, template);
        questionList.appendChild(questionElement);
    });
}

function createQuestionElement(question, template) {
    const element = template.content.cloneNode(true);
    
    // 문제 번호와 텍스트 설정
    element.querySelector('h3').textContent = `문제 ${question.number}`;
    element.querySelector('.question-text').textContent = question.text;
    
    // 보기 설정
    setupOptions(element, question);
    
    // 정답 확인 버튼 설정
    const checkButton = element.querySelector('.check-answer');
    checkButton.addEventListener('click', () => checkAnswer(question.number));
    
    // 해설 설정
    const explanation = element.querySelector('.explanation');
    explanation.textContent = question.explanation;
    
    return element;
}

function setupOptions(element, question) {
    const optionInputs = element.querySelectorAll('input[type="radio"]');
    const optionTexts = element.querySelectorAll('.option-text');
    
    optionInputs.forEach((input, index) => {
        input.name = `q${question.number}`;
        input.value = (index + 1).toString();
    });
    
    optionTexts.forEach((span, index) => {
        span.textContent = question.options[index] || `보기 ${index + 1}`;
    });
}

// 답안 체크 및 상태 업데이트
function checkAnswer(questionNumber) {
    const question = state.questions.find(q => q.number === questionNumber);
    if (!question) {
        console.error('문제를 찾을 수 없습니다:', questionNumber);
        return;
    }
    
    const selectedOption = document.querySelector(`input[name="q${questionNumber}"]:checked`);
    const questionElement = document.querySelector(`.question-item:nth-child(${state.questions.indexOf(question) + 1})`);
    
    if (!selectedOption) {
        alert('답을 선택해주세요.');
        return;
    }
    
    if (!question.answered) {
        processAnswer(question, selectedOption, questionElement);
    }
}

function processAnswer(question, selectedOption, questionElement) {
    question.answered = true;
    state.answeredCount++;
    
    const isCorrect = selectedOption.value === question.correctAnswer;
    question.isCorrect = isCorrect;
    
    updateAnswerUI(isCorrect, selectedOption, questionElement, question);
    updateProgress();
}

function updateAnswerUI(isCorrect, selectedOption, questionElement, question) {
    const result = questionElement.querySelector('.result');
    result.textContent = isCorrect ? '정답!' : '오답';
    result.className = `result ${isCorrect ? 'correct' : 'incorrect'}`;
    
    if (isCorrect) {
        state.correctCount++;
    }
    
    // 정답 표시
    const options = questionElement.querySelectorAll('.options label');
    options.forEach((label, index) => {
        if ((index + 1).toString() === question.correctAnswer) {
            label.classList.add('correct-option');
        } else if ((index + 1).toString() === selectedOption.value) {
            label.classList.add('incorrect-option');
        }
    });
    
    // 해설 표시
    const explanation = questionElement.querySelector('.explanation');
    explanation.classList.remove('hidden');
    explanation.classList.add('show');
    
    // 선택 비활성화
    disableQuestionInteraction(questionElement);
}

function disableQuestionInteraction(questionElement) {
    const optionInputs = questionElement.querySelectorAll('input[type="radio"]');
    optionInputs.forEach(input => input.disabled = true);
    
    const checkButton = questionElement.querySelector('.check-answer');
    checkButton.disabled = true;
}

// 진행 상황 업데이트
function updateProgress() {
    document.getElementById('answered-count').textContent = state.answeredCount;
    document.getElementById('answered-count2').textContent = state.answeredCount;
    document.getElementById('total-count').textContent = state.questions.length;
    document.getElementById('correct-count').textContent = state.correctCount;
}
