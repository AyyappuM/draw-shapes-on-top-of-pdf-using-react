import React, { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { Stage, Layer, Line, Circle } from 'react-konva';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';

const PDFViewer = ({pdfFile}) => {
	const [lines, setLines] = useState([]);
	const [redLines, setRedLines] = useState([]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [isErasing, setIsErasing] = useState(false);
	const [showDrawings, setShowDrawings] = useState(true);
	const [showCircles, setShowCircles] = useState(false);
	const [collectedPoints, setCollectedPoints] = useState(''); // New state to hold the points for the textarea
	const stageRef = useRef(null);
	const pdfRef = useRef(null);
	const [coordinates, setCoordinates] = useState({x1: '', y1: '', x2: '', y2: ''});
	const scale = 2;
	const pageWidth = 595;
	const pageHeight = 842;

	const handleMouseDown = (e) => {
	    const pos = stageRef.current.getPointerPosition();
	    if (isErasing) {
	            // First, check if the point is on a red line (as red is on top)
	            const redLineIndex = redLines.findIndex(line => isPointOnLine(line, pos));
	            if (redLineIndex !== -1) {
	                // Remove the red line
	                const newRedLines = [...redLines];
	                newRedLines.splice(redLineIndex, 1);
	                setRedLines(newRedLines);
	            } else {
	                // If no red line is found, check for blue lines
	                const blueLineIndex = lines.findIndex(line => isPointOnLine(line, pos));
	                if (blueLineIndex !== -1) {
	                    // Remove the blue line
	                    const newLines = [...lines];
	                    newLines.splice(blueLineIndex, 1);
	                    setLines(newLines);
	                }
	            }
	        } else if (showDrawings) {
	        setIsDrawing(true);
	        setLines([...lines, { points: [pos.x, pos.y] }]);
	    }
	};

	const handleMouseMove = (e) => {
	    if (isDrawing && showDrawings) {
	        const stage = stageRef.current;
	        const point = stage.getPointerPosition();
	        let lastLine = lines[lines.length - 1];

	        // Interpolating points between the last point and the current point
	        const lastPointX = lastLine.points[lastLine.points.length - 2];
	        const lastPointY = lastLine.points[lastLine.points.length - 1];

	        const dx = point.x - lastPointX;
	        const dy = point.y - lastPointY;
	        const distance = Math.sqrt(dx * dx + dy * dy);

	        // Calculate number of intermediate points based on distance
	        const numIntermediatePoints = Math.ceil(distance / 5); // Adjust divisor for density

	        for (let i = 1; i <= numIntermediatePoints; i++) {
	            const t = i / numIntermediatePoints; // Interpolation factor
	            const interpolatedX = lastPointX + dx * t;
	            const interpolatedY = lastPointY + dy * t;
	            lastLine.points.push(interpolatedX, interpolatedY);
	        }

	        // Update the line in the state
	        setLines([...lines]);
	        lastLine.points.push(point.x, point.y); // Add the current point as well
	        setCollectedPoints(lastLine.points.join(', '));
	    }
	};

	const handleMouseUp = (e) => {
		if (showDrawings) {
			setIsDrawing(false);
		}
	};

	const toggleDrawings = () => {
		setShowDrawings(!showDrawings);
	};

	const toggleEraser = () => {
		setIsErasing(!isErasing);
	};

	const isPointOnLine = (line, point) => {
	    const tolerance = 10; // Adjust this value to control the sensitivity
	    const points = line.points;
	    for (let i = 0; i < points.length - 1; i += 2) {
	        const x = points[i];
	        const y = points[i + 1];

	        // Check if the click is within a small range around the line point
	        if (Math.abs(x - point.x) <= tolerance && Math.abs(y - point.y) <= tolerance) {
	            return true;
	        }
	    }
	    return false;
	};


	const downloadPDF = async () => {
		const pdfPage = await html2canvas(pdfRef.current, {
			scale: 2,
		});
		const pdfPageDataURL = pdfPage.toDataURL("image/jpeg");
		const drawingsDataURL = stageRef.current.toDataURL({pixelRatio: 2});
		const pdf = new jsPDF("portrait", "pt", "a4");
		pdf.addImage(pdfPageDataURL, "JPEG", 0, 0, pageWidth, pageHeight);
		pdf.save("annotated_sample.pdf");
	};

	const downloadPDFWithAnnotations = async () => {
		const existingPdfBytes = await fetch(pdfFile).then(res => res.arrayBuffer());
		const pdfDoc = await PDFDocument.load(existingPdfBytes);
		const page = pdfDoc.getPage(0);

		// Draw blue lines
		lines.forEach(line => {
			const points = line.points;
			for (let i = 0; i < points.length - 2; i += 2) {
				const x1 = points[i];
				const y1 = points[i + 1];
				const x2 = points[i + 2];
				const y2 = points[i + 3];

				if (showDrawings) {
					page.drawLine({
						start: { x: x1, y: page.getHeight() - y1 },
						end: { x: x2, y: page.getHeight() - y2 },
						color: rgb(0, 0, 1), // Blue color
						thickness: 2,
					});
				}
			}
		});

		// Draw red lines
		redLines.forEach(line => {
			const points = line.points;
			for (let i = 0; i < points.length - 2; i += 2) {
				const x1 = points[i];
				const y1 = points[i + 1];
				const x2 = points[i + 2];
				const y2 = points[i + 3];

				if (showDrawings) {
					page.drawLine({
						start: { x: x1, y: page.getHeight() - y1 },
						end: { x: x2, y: page.getHeight() - y2 },
						color: rgb(1, 0, 0), // Red color
						thickness: 2,
					});
				}
			}
		});

		const pdfBytes = await pdfDoc.save();
		const blob = new Blob([pdfBytes], { type: 'application/pdf' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'annotated.pdf';
		link.click();
	};

	const drawRedShape = () => {
		const newRedLine = lines[lines.length - 1]; // Use the last drawn blue line for red shape
		if (newRedLine) {
			setRedLines([...redLines, newRedLine]); // Add the last blue line as a red line
		}
	};
	
	const handleDrawLine = () => {
	    if (showDrawings) {
	        const { x1, y1, x2, y2 } = coordinates;
	        const parsedX1 = parseFloat(x1);
	        const parsedY1 = parseFloat(y1);
	        const parsedX2 = parseFloat(x2);
	        const parsedY2 = parseFloat(y2);

	        // Calculate the length of the line
	        const dx = parsedX2 - parsedX1;
	        const dy = parsedY2 - parsedY1;
	        const length = Math.sqrt(dx * dx + dy * dy);

	        // Determine the number of points based on the length of the line
	        const numPoints = Math.ceil(length / 5); // Adjust the divisor for point density

	        const points = [];

	        for (let i = 0; i <= numPoints; i++) {
	            const t = i / numPoints; // Interpolation factor
	            const interpolatedX = parsedX1 + (parsedX2 - parsedX1) * t;
	            const interpolatedY = parsedY1 + (parsedY2 - parsedY1) * t;
	            points.push(interpolatedX, interpolatedY);
	        }

	        const newLine = { points };
	        setLines([...lines, newLine]);
	        resetCoordinates();
	    }
	};
	
	const handleChange = (e) => {
		setCoordinates({...coordinates, [e.target.name]: e.target.value});
	};
	
	const resetCoordinates = () => {
		setCoordinates({x1: '', y1: '', x2: '', y2: ''});
	};

	useEffect(() => {
		const stage = stageRef.current;
		stage.width(pageWidth);
		stage.height(pageHeight);
	});

	useEffect(() => {
		const handleMouseUp = (e) => {
			if (showDrawings) {
				setIsDrawing(false);
			}
		};

		// Add event listener for mouseup on the document
		document.addEventListener('mouseup', handleMouseUp);

		// Clean up the event listener on component unmount
		return () => {
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [showDrawings]);

	if (typeof Promise.withResolvers === 'undefined') {
	    if (window)
	        // @ts-expect-error This does not exist outside of polyfill which this is doing
	        window.Promise.withResolvers = function () {
	            let resolve, reject;
	            const promise = new Promise((res, rej) => {
	                resolve = res;
	                reject = rej;
	            });
	            return { promise, resolve, reject };
	        };
	}

	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
	    import.meta.url
	).toString();
	
	return (
		<div>
			<h2>PDF Viewer with freehand drawing</h2>

			<div>
				<input type="number" name="x1" value={coordinates.x1} onChange={handleChange} placeholder="Start X" />
				<input type="number" name="y1" value={coordinates.y1} onChange={handleChange} placeholder="Start Y" />
				<input type="number" name="x2" value={coordinates.x2} onChange={handleChange} placeholder="End X" />
				<input type="number" name="y2" value={coordinates.y2} onChange={handleChange} placeholder="End Y" />
				
				<button onClick={handleDrawLine}>Draw line</button>
			</div>

			<button onClick={downloadPDF}>Download PDF with annotations as image</button>

			<button onClick={downloadPDFWithAnnotations}>Download PDF with annotations</button>
	        
	        <button onClick={toggleDrawings}>
	        	{showDrawings ? 'Hide annotations': 'Show annotations'}
	        </button>

	        <button onClick={toggleEraser}>
	        	{isErasing ? 'Switch to drawing': 'Switch to eraser'}
	        </button>

	        <button 
			    onClick={drawRedShape} 
			    disabled={lines.length === 0} // Disable when there are no shapes
			>
			    Draw Red Shape
			</button>

			{/* Textarea to display collected points */}
			<textarea
				readOnly
				value={collectedPoints}
				style={{ width: 'calc(100% - 20px)', height: '100px', marginTop: '20px', marginLeft: '10px', marginRight: '10px', boxSizing: 'border-box' }}
			/>

			<label>
                <input
                    type="radio"
                    checked={showCircles}
                    onChange={() => setShowCircles(!showCircles)}
                />
                Show White Circles
            </label>
			
			<div style={{ position: 'relative', width: `${pageWidth}px`, height: `${pageHeight}px` }} ref={pdfRef}>
				<Document file={pdfFile}>
					<Page pageNumber={1} renderTextLayer={false} width={pageWidth} height={pageHeight}  />
				</Document>
				
				<div style={{ position: 'absolute', top: 0, left: 0 }}>
					<Stage ref={stageRef} width={pageWidth} height={pageHeight} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
					    <Layer visible={showDrawings}>
					        {/* Render blue shapes */}
					        {lines.map((line, index) => (
					            <Line
					                key={index}
					                points={line.points}
					                stroke="blue"
					                strokeWidth={2}
					                tension={0.5}
					                lineCap="round"
					                globalCompositeOperation="source-over"
					            />
					        ))}
					        {/* Render red shapes */}
					        {redLines.map((line, index) => (
					            <Line
					                key={`red-${index}`}
					                points={line.points}
					                stroke="red"
					                strokeWidth={2}
					                tension={0.5}
					                lineCap="round"
					                globalCompositeOperation="source-over"
					            />
					        ))}
					    </Layer>
					    <Layer>
						    {/* Render circles around line points */}
						    {lines.map((line, index) =>
						        line.points.map((point, i) => {
						            if (i % 2 === 0) { // Ensure to draw a circle for each x coordinate
						                return (
						                    <Circle
						                        key={`circle-${index}-${i}`}
						                        x={point}
						                        y={line.points[i + 1]} // Get corresponding y coordinate
						                        radius={5} // Adjust the radius as needed
						                        fill="white" // Color of the circle
						                        opacity={0.5} // Make it slightly transparent
						                    />
						                );
						            }
						            return null;
						        })
						    )}
						</Layer>
					</Stage>
				</div>
			</div>			
		</div>
	);
};

export default PDFViewer;
