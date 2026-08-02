/**
 * OMR Computer Vision & Image Processing Engine
 * Features:
 * - Automatic 4-Corner Black Fiducial Marker Detection
 * - Bilinear Perspective Warp (snaps bubbles precisely even if paper is tilted or held by hand)
 * - Visual Canvas Annotation (Cyan boxes on detected corners, Green for correct, Red for error, Blue for key)
 * - Fast, 100% native HTML5 Canvas 2D engine
 */

/**
 * Finds the 4 corner black fiducial markers on the sheet
 * @param {ImageData} imgData Canvas pixel data
 * @param {number} width Image width
 * @param {number} height Image height
 */
const findCornerMarkers = (imgData, width, height) => {
  const data = imgData.data;

  // Search regions in 4 quadrants
  const searchQuadrant = (minX, maxX, minY, maxY) => {
    let darkestDensity = 0;
    let bestX = Math.floor((minX + maxX) / 2);
    let bestY = Math.floor((minY + maxY) / 2);

    const stepX = Math.max(2, Math.floor((maxX - minX) / 40));
    const stepY = Math.max(2, Math.floor((maxY - minY) / 40));

    const boxSize = Math.max(10, Math.floor(Math.min(width, height) * 0.03));

    for (let y = minY; y < maxY - boxSize; y += stepY) {
      for (let x = minX; x < maxX - boxSize; x += stepX) {
        let darkCount = 0;
        let totalCount = 0;

        for (let dy = 0; dy < boxSize; dy += 2) {
          for (let dx = 0; dx < boxSize; dx += 2) {
            const px = x + dx;
            const py = y + dy;
            const idx = (py * width + px) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            if (gray < 90) darkCount++;
            totalCount++;
          }
        }

        const density = darkCount / totalCount;
        if (density > darkestDensity && density > 0.6) {
          darkestDensity = density;
          bestX = x + boxSize / 2;
          bestY = y + boxSize / 2;
        }
      }
    }

    return { x: bestX, y: bestY, found: darkestDensity > 0.6 };
  };

  const marginX = Math.floor(width * 0.45);
  const marginY = Math.floor(height * 0.45);

  const topLeft = searchQuadrant(0, marginX, 0, marginY);
  const topRight = searchQuadrant(width - marginX, width, 0, marginY);
  const bottomLeft = searchQuadrant(0, marginX, height - marginY, height);
  const bottomRight = searchQuadrant(width - marginX, width, height - marginY, height);

  // Fallbacks if a corner is obscured or out of frame
  if (!topLeft.found) { topLeft.x = width * 0.05; topLeft.y = height * 0.05; }
  if (!topRight.found) { topRight.x = width * 0.95; topRight.y = height * 0.05; }
  if (!bottomLeft.found) { bottomLeft.x = width * 0.05; bottomLeft.y = height * 0.95; }
  if (!bottomRight.found) { bottomRight.x = width * 0.95; bottomRight.y = height * 0.95; }

  return { topLeft, topRight, bottomLeft, bottomRight };
};

/**
 * Bilinear Interpolation mapping relative [0..1] coordinates to skewed physical sheet coordinates
 */
const getPhysicalPixel = (relX, relY, corners, width, height) => {
  const { topLeft: TL, topRight: TR, bottomLeft: BL, bottomRight: BR } = corners;

  // Top edge interpolation
  const topX = TL.x + (TR.x - TL.x) * relX;
  const topY = TL.y + (TR.y - TL.y) * relX;

  // Bottom edge interpolation
  const botX = BL.x + (BR.x - BL.x) * relX;
  const botY = BL.y + (BR.y - BL.y) * relX;

  // Vertical interpolation between top and bottom
  const px = topX + (botX - topX) * relY;
  const py = topY + (botY - topY) * relY;

  return {
    px: Math.min(width - 1, Math.max(0, Math.floor(px))),
    py: Math.min(height - 1, Math.max(0, Math.floor(py)))
  };
};

export const loadOpenCV = () => Promise.resolve(null);

export const processOmrCanvas = (canvas, exam, options = {}) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  if (width === 0 || height === 0) return null;

  const darknessThreshold = options.darknessThreshold || 0.35;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. LOCATE THE 4 BLACK CORNER FIDUCIAL MARKERS
  const corners = findCornerMarkers(imgData, width, height);

  // Helper: check average darkness at skewed physical pixel location
  const getRegionDarknessAtRel = (relX, relY, radiusPx = 8) => {
    const { px: cx, py: cy } = getPhysicalPixel(relX, relY, corners, width, height);

    let darkPixels = 0;
    let totalPixels = 0;

    for (let dy = -radiusPx; dy <= radiusPx; dy++) {
      for (let dx = -radiusPx; dx <= radiusPx; dx++) {
        if (dx * dx + dy * dy <= radiusPx * radiusPx) {
          const px = cx + dx;
          const py = cy + dy;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            if (gray < 115) darkPixels++;
            totalPixels++;
          }
        }
      }
    }

    return totalPixels > 0 ? darkPixels / totalPixels : 0;
  };

  // Create annotated output canvas
  const annotatedCanvas = document.createElement('canvas');
  annotatedCanvas.width = width;
  annotatedCanvas.height = height;
  const actx = annotatedCanvas.getContext('2d');
  actx.drawImage(canvas, 0, 0);

  // Draw Cyan Bounding Boxes on detected corner markers
  const markerBoxSize = Math.max(16, Math.floor(width * 0.03));
  actx.lineWidth = Math.max(3, Math.floor(width * 0.004));
  actx.strokeStyle = '#06b6d4'; // Cyan

  [corners.topLeft, corners.topRight, corners.bottomLeft, corners.bottomRight].forEach(c => {
    actx.strokeRect(c.x - markerBoxSize / 2, c.y - markerBoxSize / 2, markerBoxSize, markerBoxSize);
  });

  // Draw connecting quad lines in thin cyan
  actx.lineWidth = 1.5;
  actx.beginPath();
  actx.moveTo(corners.topLeft.x, corners.topLeft.y);
  actx.lineTo(corners.topRight.x, corners.topRight.y);
  actx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
  actx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
  actx.closePath();
  actx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
  actx.stroke();

  // 2. READ STUDENT ID (DÓCUMENTO DE IDENTIDAD)
  const idDigits = [];
  const idLength = exam.idLength || 6;
  const idStartX = 0.55;
  const idStepX = 0.05;
  const idStartY = 0.16;
  const idStepY = 0.015;

  for (let col = 0; col < idLength; col++) {
    let bestDigit = '?';
    let maxDarkness = darknessThreshold;

    for (let digit = 0; digit <= 9; digit++) {
      const relX = idStartX + col * idStepX;
      const relY = idStartY + digit * idStepY;
      const darkness = getRegionDarknessAtRel(relX, relY, 7);

      if (darkness > maxDarkness) {
        maxDarkness = darkness;
        bestDigit = digit.toString();
      }
    }
    idDigits.push(bestDigit);
  }
  const detectedStudentId = idDigits.join('');

  // 3. READ MULTIPLE CHOICE ANSWERS (A, B, C, D)
  const questionCount = exam.questionCount || 30;
  const columnsCount = questionCount > 60 ? 3 : questionCount > 25 ? 2 : 1;
  const questionsPerCol = Math.ceil(questionCount / columnsCount);

  const detectedAnswers = {};
  const questionDetails = [];

  let correctCount = 0;
  let incorrectCount = 0;
  let blankCount = 0;
  let doubleMarkCount = 0;

  const optionLabels = ['A', 'B', 'C', 'D', 'E'].slice(0, exam.optionsPerQuestion || 4);

  const startY = 0.35;
  const stepY = (0.92 - startY) / questionsPerCol;
  const bubbleRadius = Math.max(6, Math.floor(width * 0.012));

  for (let q = 1; q <= questionCount; q++) {
    const colIdx = Math.floor((q - 1) / questionsPerCol);
    const rowIdx = (q - 1) % questionsPerCol;

    const colStartX = 0.08 + colIdx * (0.84 / columnsCount);
    const qRelY = startY + rowIdx * stepY;

    let selectedOption = null;
    let maxDarkness = darknessThreshold;
    let markedCount = 0;

    optionLabels.forEach((opt, optIdx) => {
      const optRelX = colStartX + 0.06 + optIdx * 0.045;
      const darkness = getRegionDarknessAtRel(optRelX, qRelY, 8);

      if (darkness > maxDarkness) {
        maxDarkness = darkness;
        selectedOption = opt;
        markedCount++;
      }
    });

    if (markedCount > 1) {
      selectedOption = 'MULTIPLE';
      doubleMarkCount++;
    } else if (!selectedOption) {
      selectedOption = 'BLANK';
      blankCount++;
    }

    detectedAnswers[q] = selectedOption;

    const correctAnswer = exam.answerKey?.[q];
    const isCorrect = selectedOption === correctAnswer;

    if (isCorrect) {
      correctCount++;
    } else if (selectedOption !== 'BLANK') {
      incorrectCount++;
    }

    // DRAW VISUAL ANNOTATIONS ON OVERLAY CANVAS AT EXACT PHYSICAL SKEWED PIXEL
    optionLabels.forEach((opt, optIdx) => {
      const optRelX = colStartX + 0.06 + optIdx * 0.045;
      const { px, py } = getPhysicalPixel(optRelX, qRelY, corners, width, height);

      const wasSelected = selectedOption === opt;
      const isTheKey = correctAnswer === opt;

      if (wasSelected && isCorrect) {
        // Green filled circle for correct marked answer
        actx.fillStyle = 'rgba(16, 185, 129, 0.75)';
        actx.beginPath();
        actx.arc(px, py, bubbleRadius, 0, 2 * Math.PI);
        actx.fill();
        actx.strokeStyle = '#10b981';
        actx.stroke();
      } else if (wasSelected && !isCorrect) {
        // Red circle for wrong marked answer
        actx.fillStyle = 'rgba(239, 68, 68, 0.75)';
        actx.beginPath();
        actx.arc(px, py, bubbleRadius, 0, 2 * Math.PI);
        actx.fill();
        actx.strokeStyle = '#ef4444';
        actx.stroke();
      } else if (isTheKey && !isCorrect) {
        // Blue outline circle showing expected correct answer
        actx.lineWidth = 2;
        actx.strokeStyle = '#3b82f6';
        actx.beginPath();
        actx.arc(px, py, bubbleRadius + 2, 0, 2 * Math.PI);
        actx.stroke();
      }
    });

    questionDetails.push({
      question: q,
      detected: selectedOption,
      correct: correctAnswer,
      isCorrect
    });
  }

  const correctPts = exam.scoringRules?.correctPoints ?? 1;
  const incorrectPts = exam.scoringRules?.incorrectPoints ?? 0;

  const totalPossible = questionCount * correctPts;
  const rawScore = Math.max(0, correctCount * correctPts - incorrectCount * Math.abs(incorrectPts));
  const percentage = Math.round((rawScore / totalPossible) * 100);

  return {
    studentId: detectedStudentId === '??????' ? 'NO-DETECTADO' : detectedStudentId,
    studentName: 'Estudiante ID #' + (detectedStudentId || 'S/N'),
    score: rawScore,
    totalPossible,
    percentage,
    correctCount,
    incorrectCount,
    blankCount,
    doubleMarkCount,
    totalQuestions: questionCount,
    answers: detectedAnswers,
    details: questionDetails,
    annotatedCanvasDataUrl: annotatedCanvas.toDataURL('image/png'),
    scannedAt: new Date().toISOString()
  };
};
