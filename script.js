let repCount = 0;
        let isDown = false;
        let currentExercise = 'pushup';
        let currentMode = 'camera';
        let pose = null;
        let camera = null;
        let startTime = 0;
        let timerInterval = null;
        let isAnalyzing = false;
        let videoAnalysisInterval = null;
        let lastVoiceTime = 0;
        let voiceVolume = 0.7;

        const video = document.getElementById('video');
        const uploadedVideo = document.getElementById('uploadedVideo');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const counter = document.getElementById('counter');
        const feedback = document.getElementById('feedback');
        const angleElement = document.getElementById('angle');
        const stateElement = document.getElementById('state');
        const qualityElement = document.getElementById('quality');
        const timerElement = document.getElementById('timer');
        const exerciseName = document.getElementById('exercise-name');
        const instructions = document.getElementById('instructions');
        const videoFileInput = document.getElementById('videoFile');
        const fileUploadContainer = document.getElementById('fileUploadContainer');
        const debugInfo = document.getElementById('debugInfo');
        const startMessage = document.getElementById('startMessage');
        const comingSoonOverlay = document.getElementById('comingSoonOverlay');
        const settingsMenu = document.getElementById('settingsMenu');
        const settingsOverlay = document.getElementById('settingsOverlay');
        const volumeControl = document.getElementById('volumeControl');
        const tipsContainer = document.getElementById('tipsContainer');

        // Упражнения и их настройки с советами
        const exercises = {
            pushup: {
                name: 'отжиманий',
                downAngle: 80,
                upAngle: 160,
                instruction: '💪 Отжимания: Следите за углом локтя ~90° в нижней позиции для идеальной техники',
                tips: {
                    lowAngle: "Слишком низко! Локти должны быть под углом 90 градусов",
                    highAngle: "Не до конца выпрямили руки! Полностью выпрямляйте локти",
                    bodyAlignment: "Держите тело прямо! Таз не поднимайте",
                    perfect: "Идеальная техника! Так держать!"
                }
            },
            squat: {
                name: 'приседаний', 
                downAngle: 100,
                upAngle: 170,
                instruction: '🦵 Приседания: Следите за углом в коленях ~90° в нижней позиции, спина прямая',
                tips: {
                    lowAngle: "Слишком глубоко! Бедра должны быть параллельны полу",
                    highAngle: "Недостаточно глубоко! Опускайтесь до параллели",
                    bodyAlignment: "Спина прямая! Не наклоняйтесь вперед",
                    perfect: "Отличная техника приседания!"
                }
            },
            plank: {
                name: 'планки',
                downAngle: 160,
                upAngle: 180,
                instruction: '⏱️ Планка: Держите тело абсолютно прямо, таз не поднимайте и не опускайте'
            },
            situp: {
                name: 'подъемов пресса',
                downAngle: 60,
                upAngle: 120,
                instruction: '🔺 Пресс: Поднимайтесь до угла ~45° в тазобедренном суставе, не дергайтесь'
            }
        };

        // Функции озвучки
        function speak(text, urgency = 'normal') {
            if (!('speechSynthesis' in window)) return;
            
            const now = Date.now();
            if (now - lastVoiceTime < 2000) return; // Защита от спама
            
            lastVoiceTime = now;
            
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = voiceVolume;
            utterance.rate = urgency === 'important' ? 0.9 : 1.0;
            utterance.pitch = 1.0;
            
            const voices = speechSynthesis.getVoices();
            const russianVoices = voices.filter(voice => voice.lang.includes('ru'));
            
            if (russianVoices.length > 0) {
                utterance.voice = russianVoices[0];
            }
            
            speechSynthesis.speak(utterance);
        }

        function testVoice() {
            speak("Привет! Это тестовое сообщение. Голос работает отлично!");
        }

        function giveFeedback(angle, exercise, isDown) {
            const exerciseData = exercises[exercise];
            if (!exerciseData.tips) return;

            let feedbackText = "";
            
            if (exercise === 'pushup') {
                if (angle < 70) {
                    feedbackText = exerciseData.tips.lowAngle;
                } else if (angle > 150 && !isDown) {
                    feedbackText = exerciseData.tips.highAngle;
                } else if (angle > 100 && angle < 130 && isDown) {
                    feedbackText = exerciseData.tips.perfect;
                }
            } else if (exercise === 'squat') {
                if (angle < 90) {
                    feedbackText = exerciseData.tips.lowAngle;
                } else if (angle > 150 && !isDown) {
                    feedbackText = exerciseData.tips.highAngle;
                } else if (angle > 110 && angle < 130 && isDown) {
                    feedbackText = exerciseData.tips.perfect;
                }
            }

            if (feedbackText) {
                speak(feedbackText, 'important');
                showTip(feedbackText, feedbackText.includes('Идеальная') || feedbackText.includes('Отличная') ? 'success' : 'warning');
            }
        }

        function showTip(text, type = 'normal') {
            const tipCard = document.createElement('div');
            tipCard.className = `tip-card ${type === 'warning' ? 'warning' : type === 'success' ? 'success' : ''}`;
            tipCard.innerHTML = `<strong>💡 Совет:</strong> ${text}`;
            
            tipsContainer.innerHTML = '';
            tipsContainer.appendChild(tipCard);
            
            setTimeout(() => {
                tipCard.style.opacity = '0';
                tipCard.style.transition = 'opacity 0.5s';
                setTimeout(() => tipCard.remove(), 500);
            }, 5000);
        }

        // Функции тем
        function setTheme(themeName) {
            document.body.className = `theme-${themeName}`;
            
            // Обновляем активную кнопку темы
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-theme') === themeName) {
                    btn.classList.add('active');
                }
            });
            
            // Сохраняем в localStorage
            localStorage.setItem('selectedTheme', themeName);
        }

        function loadTheme() {
            const savedTheme = localStorage.getItem('selectedTheme') || 'neon';
            setTheme(savedTheme);
        }

        // Функции меню
        function toggleSettings() {
            settingsMenu.classList.toggle('active');
            settingsOverlay.classList.toggle('active');
        }

        function showComingSoon() {
            comingSoonOverlay.style.display = 'flex';
        }

        function closeComingSoon() {
            comingSoonOverlay.style.display = 'none';
        }

        function setMode(mode) {
            if (mode === 'video') {
                showComingSoon();
                return;
            }
            
            currentMode = mode;
            
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            if (mode === 'camera') {
                video.classList.remove('hidden');
                uploadedVideo.classList.add('hidden');
                fileUploadContainer.style.display = 'none';
                feedback.textContent = "Режим камеры: нажмите Старт для начала анализа";
                debugInfo.textContent = "Режим: Камера";
            }
            
            resetCounter();
        }

        // НОВАЯ ФУНКЦИЯ: Сброс только состояния упражнения
        function resetExerciseState() {
            repCount = 0;
            counter.textContent = "0";
            isDown = false;
            stateElement.textContent = "-";
            qualityElement.textContent = "-";
            stateElement.style.color = "var(--primary-color)";
            qualityElement.style.color = "var(--primary-color)";
            
            if (currentExercise === 'plank') {
                feedback.textContent = "Готов к планке! Держите тело прямо";
            } else {
                feedback.textContent = `Готов к ${exercises[currentExercise].name}`;
            }
            
            debugInfo.textContent = "Упражнение изменено. Готово!";
        }

        function setExercise(exercise) {
            if (exercise === 'plank' || exercise === 'situp') {
                showComingSoon();
                return;
            }
            
            currentExercise = exercise;
            
            document.querySelectorAll('.exercise-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            exerciseName.textContent = exercises[exercise].name;
            instructions.textContent = exercises[exercise].instruction;
            
            // ВАЖНО: используем resetExerciseState вместо resetCounter
            resetExerciseState();
            
            if (isAnalyzing) {
                startMessage.style.display = 'block';
                setTimeout(() => {
                    startMessage.style.display = 'none';
                }, 2000);
            }
        }

        function calculateAngle(a, b, c) {
            const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
            let angle = Math.abs(radians * 180 / Math.PI);
            return angle > 180 ? 360 - angle : angle;
        }

        function startTimer() {
            startTime = Date.now();
            if (timerInterval) clearInterval(timerInterval);
            
            timerInterval = setInterval(() => {
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                timerElement.textContent = seconds + 'с';
            }, 1000);
        }

        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function onResults(results) {
            if (!results.poseLandmarks || !isAnalyzing) {
                return;
            }

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Рисуем изображение (уже зеркальное из-за CSS)
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            
            // СКЕЛЕТ СКРЫТ - убрали отрисовку скелета
            
            ctx.restore();

            const landmarks = results.poseLandmarks;
            const exercise = exercises[currentExercise];
            
            // Анализируем позу
            let angle = 0;
            
            if (currentExercise === 'pushup' || currentExercise === 'plank') {
                const shoulder = landmarks[11];
                const elbow = landmarks[13];
                const wrist = landmarks[15];
                angle = calculateAngle(shoulder, elbow, wrist);
                
            } else if (currentExercise === 'squat') {
                const hip = landmarks[23];
                const knee = landmarks[25];
                const ankle = landmarks[27];
                angle = calculateAngle(hip, knee, ankle);
                
            } else if (currentExercise === 'situp') {
                const shoulder = landmarks[11];
                const hip = landmarks[23];
                const knee = landmarks[25];
                angle = calculateAngle(shoulder, hip, knee);
            }

            angleElement.textContent = Math.round(angle) + '°';
            debugInfo.textContent = `Обнаружена поза. Угол: ${Math.round(angle)}°`;

            // Логика подсчета
            if (currentExercise === 'plank') {
                stateElement.textContent = "ДЕРЖИМ";
                stateElement.style.color = "var(--primary-color)";
                qualityElement.textContent = "✅ ИДЕАЛЬНО";
                
            } else {
                if (angle < exercise.downAngle && !isDown) {
                    isDown = true;
                    stateElement.textContent = "НИЗ";
                    stateElement.style.color = "var(--secondary-color)";
                    debugInfo.textContent = `НИЗ: угол ${Math.round(angle)}°`;
                    giveFeedback(angle, currentExercise, true);
                } else if (angle > exercise.upAngle && isDown) {
                    repCount++;
                    isDown = false;
                    counter.textContent = repCount;
                    stateElement.textContent = "ВЕРХ";
                    stateElement.style.color = "var(--primary-color)";
                    feedback.textContent = `🎉 ${exercise.name.charAt(0).toUpperCase() + exercise.name.slice(1)} #${repCount}!`;
                    debugInfo.textContent = `Повторение #${repCount}! Угол: ${Math.round(angle)}°`;
                    speak(`Повторение ${repCount}`);
                    giveFeedback(angle, currentExercise, false);
                    
                    counter.classList.add('pulse');
                    setTimeout(() => counter.classList.remove('pulse'), 1000);
                }

                if (angle > exercise.upAngle - 10 && !isDown) {
                    qualityElement.textContent = "✅ ИДЕАЛЬНО";
                    qualityElement.style.color = "var(--primary-color)";
                } else if (angle < exercise.downAngle + 20 && isDown) {
                    qualityElement.textContent = "⚠️ ГЛУБОКО";
                    qualityElement.style.color = "var(--secondary-color)";
                }
            }
        }

        async function startCameraAnalysis() {
            try {
                feedback.textContent = "🔄 Запуск камеры...";
                debugInfo.textContent = "Инициализация камеры...";
                startMessage.style.display = 'block';
                
                // Останавливаем предыдущую камеру если была
                if (camera) {
                    await camera.stop();
                }

                pose = new Pose({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                pose.onResults(onResults);

                // Запускаем камеру с фронтальным видом
                camera = new Camera(video, {
                    onFrame: async () => {
                        if (isAnalyzing && pose) {
                            try {
                                await pose.send({image: video});
                            } catch (error) {
                                console.error('Ошибка анализа кадра:', error);
                            }
                        }
                    },
                    width: 640,
                    height: 480
                });

                await camera.start();
                
                // Устанавливаем размеры canvas
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                isAnalyzing = true;
                
                // Скрываем сообщение через 3 секунды
                setTimeout(() => {
                    startMessage.style.display = 'none';
                    feedback.textContent = "📹 Камера активна! Начинайте упражнение";
                    speak("Камера активна! Начинайте упражнение");
                }, 3000);
                
                debugInfo.textContent = `Камера запущена: ${video.videoWidth}x${video.videoHeight}`;
                startTimer();

            } catch (error) {
                console.error('Ошибка запуска камеры:', error);
                feedback.textContent = "❌ Ошибка доступа к камере";
                debugInfo.textContent = "Ошибка: " + error.message;
                startMessage.style.display = 'none';
            }
        }

        function startAnalysis() {
            if (currentMode === 'camera') {
                startCameraAnalysis();
            }
        }

        function stopAnalysis() {
            isAnalyzing = false;
            stopTimer();
            startMessage.style.display = 'none';
            
            if (camera) {
                camera.stop();
            }
            
            if (uploadedVideo) {
                uploadedVideo.pause();
            }
            
            feedback.textContent = "Анализ остановлен";
            debugInfo.textContent = "Анализ приостановлен";
            speak("Анализ остановлен");
        }

        function resetCounter() {
            repCount = 0;
            counter.textContent = "0";
            feedback.textContent = "Счетчик сброшен! Нажмите Старт для начала";
            isDown = false;
            stateElement.textContent = "-";
            qualityElement.textContent = "-";
            stateElement.style.color = "var(--primary-color)";
            qualityElement.style.color = "var(--primary-color)";
            stopTimer();
            timerElement.textContent = "0с";
            isAnalyzing = false;  // ← Это останавливает анализ
            startMessage.style.display = 'none';
            debugInfo.textContent = "Сброс выполнен. Готов к новому подходу.";
            speak("Счетчик сброшен");
        }

        // Инициализация при загрузке
        function initializeApp() {
            loadTheme();
            
            // Настройка громкости
            volumeControl.addEventListener('input', function() {
                voiceVolume = parseFloat(this.value);
            });

            debugInfo.textContent = "Система готова. Выберите режим и нажмите Старт.";
        }

        // Автозапуск
        window.onload = initializeApp;