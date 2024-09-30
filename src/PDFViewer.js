import React, { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { Stage, Layer, Line } from 'react-konva';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';

const PDFViewer = ({pdfFile}) => {
    const [lines, setLines] = useState([]);
    const [redLines, setRedLines] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isErasing, setIsErasing] = useState(false);
    const [showDrawings, setShowDrawings] = useState(true);
    const [colorHex, setColorHex] = useState('#000000'); // Default to black
    const [newOrigin, setNewOrigin] = useState({ x: 0, y: 0 }); // New state for origin coordinates
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
            // Check for both red and blue lines for erasure
            const lineIndex = [...redLines, ...lines].findIndex(line => isPointOnLine(line, pos));
            if (lineIndex !== -1) {
                if (lineIndex < redLines.length) {
                    // Remove from redLines
                    const newRedLines = [...redLines];
                    newRedLines.splice(lineIndex, 1);
                    setRedLines(newRedLines);
                } else {
                    // Remove from lines
                    // Instead of removing the specific index, we remove the last line
                    const newLines = [...lines];
                    if (newLines.length > 0) {
                        newLines.pop(); // Remove the last element from lines
                        setLines(newLines);
                    }
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
            lastLine.points = lastLine.points.concat([point.x + newOrigin.x, point.y + newOrigin.y]); // Adjust for new origin
            lines.splice(lines.length - 1, 1, lastLine);
            setLines([...lines]);

            // Update the textarea with collected points
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
        
        for (let i = 0; i < points.length - 2; i += 2) {
            const x1 = points[i];
            const y1 = points[i + 1];
            const x2 = points[i + 2];
            const y2 = points[i + 3];

            // Calculate the distance from the point to the line segment
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lengthSquared = dx * dx + dy * dy;
            const t = lengthSquared > 0 ? ((point.x - x1) * dx + (point.y - y1) * dy) / lengthSquared : -1;

            let closestX, closestY;

            if (t < 0) {
                closestX = x1;
                closestY = y1;
            } else if (t > 1) {
                closestX = x2;
                closestY = y2;
            } else {
                closestX = x1 + t * dx;
                closestY = y1 + t * dy;
            }

            const distance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);

            if (distance <= tolerance) {
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

    const hexToRgb = (hex) => {
        if (!hex) {
            // Default to black if hex is not defined
            return { r: 0, g: 0, b: 0 };
        }

        // Remove the hash at the start if it's there
        hex = hex.replace(/^#/, '');

        // Parse r, g, b values
        let bigint = parseInt(hex, 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;

        return { r, g, b };
    };

    const downloadPDFWithAnnotations = async () => {
        const existingPdfBytes = await fetch(pdfFile).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const page = pdfDoc.getPage(0);

        // Draw blue lines
        lines.forEach(line => {
            const points = line.points;
            const { r, g, b } = hexToRgb(line.color || '#000000'); // Use default color if line.color is undefined

            for (let i = 0; i < points.length - 2; i += 2) {
                const x1 = points[i];
                const y1 = points[i + 1];
                const x2 = points[i + 2];
                const y2 = points[i + 3];

                if (showDrawings) {
                    page.drawLine({
                        start: { x: x1, y: page.getHeight() - y1 },
                        end: { x: x2, y: page.getHeight() - y2 },
                        color: rgb(r / 255, g / 255, b / 255), // Use the converted RGB color
                        thickness: 2,
                    });
                }
            }
        });

        // Draw red lines (unchanged)
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
                        color: rgb(1, 0, 0), // Red color remains unchanged
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
        // Parse the points from the textarea (collectedPoints)
        const pointsArray = collectedPoints.split(',').map(point => parseFloat(point.trim()));

        if (pointsArray.length >= 4) { // Ensure we have at least two points (x1, y1, x2, y2)
            const newRedLine = { points: pointsArray };
            setRedLines([...redLines, newRedLine]);
        }
    };

    // Function to add shape using points from textarea and the chosen color
    const addShapeUsingPoints = () => {
        // Parse the points from the textarea (collectedPoints)
        const pointsArray = collectedPoints.split(',').map(point => parseFloat(point.trim()));

        if (pointsArray.length >= 4) { // Ensure we have at least two points (x1, y1, x2, y2)
            const newShape = {
                points: pointsArray.map((point, index) => index % 2 === 0 ? point + newOrigin.x : point + newOrigin.y), // Adjust for new origin
                color: colorHex
            };
            setLines([...lines, newShape]);
        }
    };
            
    const handleDrawLine = () => {
        if (showDrawings) {
            const {x1, y1, x2, y2} = coordinates;
            const parsedX1 = parseFloat(x1);
            const parsedY1 = parseFloat(y1);
            const parsedX2 = parseFloat(x2);
            const parsedY2 = parseFloat(y2);

            // Only add the line if all coordinates are valid
            if (!isNaN(parsedX1) && !isNaN(parsedY1) && !isNaN(parsedX2) && !isNaN(parsedY2)) {
                const newLine = { points: [parsedX1, parsedY1, parsedX2, parsedY2], color: colorHex };
                setLines([...lines, newLine]);
            }
            
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
        console.log('Current lines:', lines);
    }, [lines]);

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

            {/* New button and color input */}
            <button onClick={addShapeUsingPoints}>Add shape using points from textarea</button>
            <input 
                type="text" 
                value={colorHex} 
                onChange={(e) => setColorHex(e.target.value)} 
                placeholder="Enter color hex code"
                style={{ marginLeft: '10px', width: '120px' }}
            />

            <div>
                <input
                    type="number"
                    value={newOrigin.x}
                    onChange={(e) => setNewOrigin({ ...newOrigin, x: parseFloat(e.target.value) })}
                    placeholder="New Origin X"
                />
                <input
                    type="number"
                    value={newOrigin.y}
                    onChange={(e) => setNewOrigin({ ...newOrigin, y: parseFloat(e.target.value) })}
                    placeholder="New Origin Y"
                />
            </div>

            {/* Textarea to display collected points */}
            <textarea
                value={collectedPoints}
                onChange={(e) => setCollectedPoints(e.target.value)} // Allow editing
                style={{ width: 'calc(100% - 20px)', height: '100px', marginTop: '20px', marginLeft: '10px', marginRight: '10px', boxSizing: 'border-box' }}
            />
            
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
                                    stroke={line.color || 'black' }
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
                    </Stage>
                </div>
            </div>          
        </div>
    );
};

export default PDFViewer;