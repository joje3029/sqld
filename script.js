let currentQuestions = [];
let currentQuestionIndex = 0;
let currentRound = '';
let score = 0;
let selectedAnswer = null;

// 문제 데이터를 저장할 배열
let questions = [];

// 진행 상황을 추적할 변수들
let answeredCount = 0;
let correctCount = 0;

// 페이지 로드 시 문제 불러오기
window.addEventListener('DOMContentLoaded', loadQuestions);

// 마크다운 파일을 불러오고 파싱하는 함수
async function loadQuestions() {
    try {
        const response = await fetch('note.md');
        const text = await response.text();
        questions = parseQuestions(text);
        console.log("questions : ", questions);
        renderQuestions();
        updateProgress();
    } catch (error) {
        console.error('문제를 불러오는데 실패했습니다:', error);
    }
}

// 마크다운 텍스트를 파싱하여 문제 객체로 변환하는 함수
function parseQuestions(markdown) {
    const sections = markdown.split('### 문제');
    const parsedQuestions = [];
    
    sections.slice(1).forEach((section) => {
        const lines = section.trim().split('\n');
        
        // 문제 번호 추출 (첫 번째 줄에서 숫자만 추출)
        const questionNumber = parseInt(lines[0].trim());
        if (isNaN(questionNumber)) {
            console.error('문제 번호를 찾을 수 없습니다:', lines[0]);
            return;
        }
        
        // 문제 텍스트 추출
        let questionText = '';
        let options = [];
        let correctAnswer = '';
        let explanation = '';
        
        let isQuestionContent = true;
        let isExplanation = false;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('정답:')) {
                isQuestionContent = false;
                const answerText = line.replace('정답:', '').trim();
                correctAnswer = parseAnswer(answerText);
                continue;
            }
            
            if (line.startsWith('해설:')) {
                isQuestionContent = false;
                isExplanation = true;
                continue;
            }
            
            if (isExplanation && line && !line.startsWith('---')) {
                explanation += line + '\n';
                continue;
            }
            
            if (isQuestionContent && line) {
                if (line.match(/^\d\)/)) {
                    // 번호가 있는 보기
                    options.push(line.substring(line.indexOf(')') + 1).trim());
                } else if (!line.startsWith('---')) {
                    questionText += line + '\n';
                }
            }
        }
        
        // 보기가 없는 경우 임시 보기 생성
        if (options.length === 0) {
            options = [
                '보기 1',
                '보기 2',
                '보기 3',
                '보기 4'
            ];
        }
        
        parsedQuestions.push({
            number: questionNumber,
            text: questionText.trim(),
            options: options.slice(0, 4), // 최대 4개의 보기만 사용
            correctAnswer: correctAnswer || '1', // 기본값 1로 설정
            explanation: explanation.trim(),
            answered: false,
            isCorrect: false
        });
    });
    
    // 문제 번호 순으로 정렬
    parsedQuestions.sort((a, b) => a.number - b.number);
    
    return parsedQuestions;
}

// 답안 텍스트를 숫자로 변환하는 함수
function parseAnswer(answerText) {
    const match = answerText.match(/\d+/);
    return match ? match[0] : '1';
}

// 표 형식의 보기를 파싱하는 함수
function parseTableOptions(tableRow) {
    return tableRow
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim());
}

// 문제를 화면에 렌더링하는 함수
function renderQuestions() {
    const questionList = document.getElementById('question-list');
    const template = document.getElementById('question-template');
    
    questions.forEach(question => {
        const questionElement = template.content.cloneNode(true);
        
        // 문제 번호와 텍스트 설정
        questionElement.querySelector('h3').textContent = `문제 ${question.number}`;
        questionElement.querySelector('.question-text').textContent = question.text;
        
        // 보기 설정
        const optionInputs = questionElement.querySelectorAll('input[type="radio"]');
        const optionTexts = questionElement.querySelectorAll('.option-text');
        
        optionInputs.forEach((input, index) => {
            input.name = `q${question.number}`;
            input.value = (index + 1).toString();
        });
        
        optionTexts.forEach((span, index) => {
            span.textContent = question.options[index] || `보기 ${index + 1}`;
        });
        
        // 정답 확인 버튼 이벤트 설정
        const checkButton = questionElement.querySelector('.check-answer');
        checkButton.addEventListener('click', () => checkAnswer(question.number));
        
        // 해설 설정
        const explanation = questionElement.querySelector('.explanation');
        console.log("question.explanation : ", question.explanation);
        if (question.explanation && question.explanation.trim()) {
            explanation.textContent = question.explanation;
            console.log("explanation.textContent : ", explanation.textContent);
        } else {
            explanation.textContent = '해설이 없습니다.';
        }
        
        questionList.appendChild(questionElement);
    });
}

// 답안을 체크하는 함수
function checkAnswer(questionNumber) {
    const question = questions.find(q => q.number === questionNumber);
    if (!question) {
        console.error('문제를 찾을 수 없습니다:', questionNumber);
        return;
    }
    
    const selectedOption = document.querySelector(`input[name="q${questionNumber}"]:checked`);
    const questionElement = document.querySelector(`.question-item:nth-child(${questions.indexOf(question) + 1})`);
    const result = questionElement.querySelector('.result');
    const explanation = questionElement.querySelector('.explanation');
    
    if (!selectedOption) {
        alert('답을 선택해주세요.');
        return;
    }
    
    if (!question.answered) {
        question.answered = true;
        answeredCount++;
        
        const isCorrect = selectedOption.value === question.correctAnswer;
        question.isCorrect = isCorrect;
        
        if (isCorrect) {
            correctCount++;
            result.textContent = '정답!';
            result.className = 'result correct';
        } else {
            result.textContent = '오답';
            result.className = 'result incorrect';
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
        explanation.classList.remove('hidden');
        explanation.classList.add('show');  // show 클래스 추가
        
        // 진행 상황 업데이트
        updateProgress();
        
        // 선택 비활성화
        const optionInputs = questionElement.querySelectorAll('input[type="radio"]');
        optionInputs.forEach(input => input.disabled = true);
        
        // 버튼 비활성화
        const checkButton = questionElement.querySelector('.check-answer');
        checkButton.disabled = true;
    }
}

// 진행 상황을 업데이트하는 함수
function updateProgress() {
    document.getElementById('answered-count').textContent = answeredCount;
    document.getElementById('answered-count2').textContent = answeredCount;
    document.getElementById('total-count').textContent = questions.length;
    document.getElementById('correct-count').textContent = correctCount;
}

function updateScore() {
    const total = questions.length;
    const answered = questions.filter(q => q.answered).length;
    const correct = questions.filter(q => q.isCorrect).length;
    
    document.getElementById('answered-count').textContent = answered;
    document.getElementById('total-count').textContent = total;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('answered-count2').textContent = answered;
}

function updateQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    document.getElementById('question-number').textContent = `${currentQuestionIndex + 1}/${currentQuestions.length}`;
    document.getElementById('score').textContent = `점수: ${score}`;
    document.getElementById('question-content').textContent = question.text;
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
