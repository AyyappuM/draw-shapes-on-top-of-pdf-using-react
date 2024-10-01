import React, { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { Stage, Layer, Line } from 'react-konva';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';

const PDFViewer = ({pdfFile}) => {
    const [lines, setLines] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isErasing, setIsErasing] = useState(false);
    const [showDrawings, setShowDrawings] = useState(true);
    const [colorHex, setColorHex] = useState('#000000'); // Default to black
    const [newOrigin, setNewOrigin] = useState({ x: 0, y: 0 }); // New state for origin coordinates
    const [collectedPoints, setCollectedPoints] = useState(''); // New state to hold the points for the textarea
    const stageRefs = useRef([]);
    const pdfRef = useRef(null);
    const pageRefs = useRef([]); 
    const [coordinates, setCoordinates] = useState({x1: '', y1: '', x2: '', y2: ''});
    const scale = 2;
    const [pageWidth, setPageWidth] = useState(0);
    const [pageHeight, setPageHeight] = useState(0);
    const [pageWidths, setPageWidths] = useState([]);
    const [pageHeights, setPageHeights] = useState([]);
    const [numPages, setNumPages] = React.useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentActivePage, setCurrentActivePage] = useState(1);
    const [currentStage, setCurrentStage] = useState(null);
    const isDrawingRef = useRef(false);

    const onLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setCurrentPage(1); // Reset current page to 1 on load
        // Initialize page refs
        pageRefs.current = new Array(numPages).fill().map(() => React.createRef());
    };

    // Handle scroll event to update current page
    const handleScroll = () => {
        setCurrentStage(null);
        if (pdfRef.current) {
          //console.log('Scroll event triggered'); // Debugging log
          const scrollTop = pdfRef.current.scrollTop; // Get current scroll position
          //console.log('scrollTop', scrollTop);
          let foundPage = 1; // Default to the first page
          let cumulativeHeight = 0;

          // Calculate cumulative height of each page
          for (let i = 0; i < numPages; i++) {
            const pageHeight = pageRefs.current[i]?.current?.clientHeight || 0; // Get the height of the page
            cumulativeHeight += pageHeight; // Update cumulative height

            // If scrollTop is less than cumulative height, we've found the current page
            //console.log('cumulativeHeight', cumulativeHeight);
            if (scrollTop < cumulativeHeight) {
              foundPage = i + 1; // Page number is index + 1
              break; // Exit the loop once the current page is found
            }
          }

          //console.log('foundPage', foundPage);
          // Update the current page only if it changes
          if (foundPage !== currentPage) {
            setCurrentPage(foundPage); // Update current page if it changes
            console.log(`Current page: ${foundPage}`); // Log the current page for debugging
          }
        }
    };

    useEffect(() => {
        const pdfContainer = pdfRef.current;

        if (pdfContainer) {
          // Ensure to remove any existing event listeners before adding
          pdfContainer.removeEventListener('scroll', handleScroll);
          pdfContainer.addEventListener('scroll', handleScroll);
          //console.log('Scroll event listener added'); // Confirm the listener is added
        }

        return () => {
          if (pdfContainer) {
            pdfContainer.removeEventListener('scroll', handleScroll);
            //console.log('Scroll event listener removed'); // Confirm the listener is removed
          }
        };
    }, [currentPage, numPages]);

    const onPageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        console.log(`Current page: ${pageNumber}`); // Log the current page
    };

    

    const handleMouseEnter = (pageIndex) => {
        const stage = stageRefs.current[pageIndex];
        if (!stage) return;

        const pos = stage.getPointerPosition();
        if (pos) {
            setCurrentActivePage(pageIndex + 1);
            // Do not start drawing here
        }
    };


    const handleMouseDown = (pageIndex, e) => {
        isDrawingRef.current = true;
        setCurrentActivePage(pageIndex+1);
        //console.log('pageIndex: ', pageIndex);
        const stage = stageRefs.current[pageIndex];
        //console.log('stage ', stage);
        if (!stage) return;
        const pos = stage.getPointerPosition();
        //console.log('pos ', pos);

        if (isErasing) {
            // Check for both red and blue lines for erasure
            let lineIndex = -1;

            // Check in reverse order to prioritize topmost lines
            for (let i = lines.length - 1; i >= 0; i--) {
                if (isPointOnLine(lines[i], pos)) {
                    lineIndex = i;
                    break; // Found the topmost line clicked
                }
            }

            if (lineIndex !== -1) {
                const newLines = [...lines];
                newLines.splice(lineIndex - lines.length, 1); // Remove the specific line clicked
                setLines(newLines);
            } else {
                // If no line was clicked, consider popping the last element
                const newLines = [...lines];
                if (newLines.length > 0) {
                    newLines.pop(); // Remove the last element from lines
                    setLines(newLines);
                }
            }
        } else if (showDrawings) {
            setIsDrawing(true);
            setLines([...lines, { points: [pos.x, pos.y], color: colorHex, page: currentActivePage }]);
        }
    };

    const handleMouseLeave = () => {
        isDrawingRef.current = false;
        console.log('left');
        setIsDrawing(false); // Stop drawing when the mouse leaves the stage
        return;
    };

    const handleMouseMove = (pageIndex, e) => {            
        if (!isDrawingRef.current) return;
        /*
        //console.log('point: ', point);

        if (currentStage !== null && e.target._id !== currentStage) {
        //if (point.x > pageWidth || point.x < 0 || point.y < 0 || point.y > pageHeight) {
            setCurrentStage(e.target._id); // Update the current target ID
            //console.log('exceeded'); // stop drawing after this
            setIsDrawing(false);
            setLines([...lines]); // Finalize the current line
            setCurrentStage(null); // Reset stage tracking
            return;
        }

        // Update target ID on the first move
        if (currentStage === null) {
            setCurrentStage(e.target._id);
        }
        */

        if (isDrawing && showDrawings) {
            setCurrentActivePage(pageIndex+1);
            const stage = stageRefs.current[pageIndex];
            if (!stage) return;
            const point = stage.getPointerPosition();          
            let lastLine = lines[lines.length - 1];
            lastLine.points = lastLine.points.concat([point.x, point.y]);
            lines.splice(lines.length - 1, 1, lastLine);
            setLines([...lines]);

            // Update the textarea with collected points
            setCollectedPoints(lastLine.points.join(', '));
        }
    };

    const handleMouseUp = (e) => {
        isDrawingRef.current = false;
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
        const drawingsDataURL = stageRefs.current[currentPage].toDataURL({pixelRatio: 2});
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

    const interpolatePoints = (x1, y1, x2, y2, numPoints = 10) => {
        const points = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const x = x1 + t * (x2 - x1);
            const y = y1 + t * (y2 - y1);
            points.push({ x, y });
        }
        console.log('interpolatePoints ', points);
        return points;
    };

    const initializePDF = async (pdfFile) => {
        const existingPdfBytes = await fetch(pdfFile).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const page = pdfDoc.getPage(0);

        // Set the page width and height
        setPageWidth(page.getWidth());
        setPageHeight(page.getHeight());

        return pdfDoc;
    };

    const downloadPDFWithAnnotations = async () => {
        const pdfDoc = await initializePDF(pdfFile);

        pdfDoc.getPages().forEach((page, pageIndex) => {
            lines.forEach(line => {
                const points = line.points;
                const { r, g, b } = hexToRgb(line.color || '#000000'); // Use default color if line.color is undefined

                // Check if we should show the drawing for the current page
                if (showDrawings && line.page === pageIndex + 1) {
                    for (let i = 0; i < points.length - 2; i += 2) {
                        const x1 = points[i];
                        const y1 = points[i + 1];
                        const x2 = points[i + 2];
                        const y2 = points[i + 3];

                        // Draw the line directly from the stored points
                        page.drawLine({
                            start: { x: x1, y: page.getHeight() - y1 },
                            end: { x: x2, y: page.getHeight() - y2 },
                            color: rgb(r / 255, g / 255, b / 255), // Use the converted RGB color
                            thickness: 2,
                        });
                    }
                }
            });
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'annotated.pdf';
        link.click();
    };

    // Function to add shape using points from textarea and the chosen color
    const addShapeUsingPoints = () => {
        // Parse the points from the textarea (collectedPoints)
        const pointsArray = collectedPoints.split(',').map(point => parseFloat(point.trim()));

        if (pointsArray.length >= 4) { // Ensure we have at least two points (x1, y1, x2, y2)
            const newShape = {
                points: pointsArray.map((point, index) => index % 2 === 0 ? point + newOrigin.x : point + newOrigin.y), // Adjust for new origin
                color: colorHex,
                page: currentActivePage
            };
            setLines([...lines, newShape]);
        }
    };
            
    const handleDrawLine = () => {
        if (showDrawings) {
            const { x1, y1, x2, y2 } = coordinates;
            const parsedX1 = parseFloat(x1) + newOrigin.x; // Adjust for new origin
            const parsedY1 = parseFloat(y1) + newOrigin.y; // Adjust for new origin
            const parsedX2 = parseFloat(x2) + newOrigin.x; // Adjust for new origin
            const parsedY2 = parseFloat(y2) + newOrigin.y; // Adjust for new origin

            // Only add the line if all coordinates are valid
            if (!isNaN(parsedX1) && !isNaN(parsedY1) && !isNaN(parsedX2) && !isNaN(parsedY2)) {
                const newLine = { points: [parsedX1, parsedY1, parsedX2, parsedY2], color: colorHex, page: currentActivePage };
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
        initializePDF(pdfFile);
    }, [pdfFile]);

    // Log the dimensions whenever they change
    useEffect(() => {
        console.log(pageWidth, pageHeight);
    }, [pageWidth, pageHeight]);

    useEffect(() => {
        console.log(numPages);
    }, [numPages]);

    useEffect(() => {
        //console.log('Current lines:', lines);
    }, [lines]);

    useEffect(() => {
        if (stageRefs.current[currentPage]) {
          const stage = stageRefs.current[currentPage];
          stage.width(pageWidth);
          stage.height(pageHeight);
        }
    }, [currentPage, pageWidth, pageHeight]); 

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
        <div class="outer_div">
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
            <div>
                <p>Current Page: {currentPage}</p>
            </div>
            <div id="scroll_div" style={{ overflowY: 'scroll', height: '80vh', position: 'relative', width: `${pageWidth+100}px`, height: `${pageHeight}px` }} onScroll={handleScroll} ref={pdfRef}>
                
                <Document file={pdfFile} onLoadSuccess={onLoadSuccess}>
                    {Array.from(new Array(numPages), (el, index) => (
                      <div key={`page_${index + 1}`} ref={pageRefs.current[index]} >
                        <Page pageNumber={index + 1} renderTextLayer={false}>
                        <div style={{ position: 'absolute', top: 0, left: 0 }}>
                            <Stage ref={(el) => (stageRefs.current[index] = el)} width={pageWidth} height={pageHeight}
                                onMouseDown={(e) => {
                                    handleMouseDown(index, e);
                                }}
                                onMouseMove={(e) => {
                                    handleMouseMove(index, e);
                                }}
                                onMouseLeave={handleMouseLeave}
                                onMouseEnter={() => handleMouseEnter(index)} 
                                onMouseUp={handleMouseUp}>
                                <Layer visible={showDrawings}>
                                    {lines
                                        .filter((line) => line.page === index+1)
                                        .map((line, i) => (
                                        <Line
                                            key={i}
                                            points={line.points}
                                            stroke={line.color || 'black' }
                                            strokeWidth={2}
                                            tension={0.5}
                                            lineCap="round"
                                            globalCompositeOperation="source-over"
                                        />
                                    ))}
                                </Layer>
                            </Stage>
                        </div>
                        </Page>
                      </div>
                    ))}
                </Document>                    
            </div>         
        </div>
    );
};

export default PDFViewer;