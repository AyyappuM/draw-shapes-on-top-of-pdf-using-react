import React, { useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { render } from 'react-dom';

const PDFViewer = ({pdfFile}) => {
	const [lines, setLines] = useState([]);
	const [coordinates, setCoordinates] = useState({x1: '', y1: '', x2: '', y2: ''});
	
	const handleDrawLine = () => {
		const {x1,y1,x2,y2} = coordinates;
		const parsedX1 = parseFloat(x1);
		const parsedY1 = parseFloat(y1);
		const parsedX2 = parseFloat(x2);
		const parsedY2 = parseFloat(y2);
		
		const newLine = {points: [parsedX1, parsedY1, parsedX2, parsedY2]};
		setLines([...lines, newLine]);
		resetCoordinates();
	};
	
	const handleChange = (e) => {
		setCoordinates({...coordinates, [e.target.name]: e.target.value});
	};
	
	const resetCoordinates = () => {
		setCoordinates({x1: '', y1: '', x2: '', y2: ''});
	};

	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		'pdfjs-dist/build/pdf.worker.min.mjs',
		import.meta.url,
	).toString();
	
	return (
		<div>
			<h2>PDF Viewer with line drawing</h2>
			
			<div>
				<input type="number" name="x1" value={coordinates.x1} onChange={handleChange} placeholder="Start X" />
				<input type="number" name="y1" value={coordinates.y1} onChange={handleChange} placeholder="Start Y" />
				<input type="number" name="x2" value={coordinates.x2} onChange={handleChange} placeholder="End X" />
				<input type="number" name="y2" value={coordinates.y2} onChange={handleChange} placeholder="End Y" />
				
				<button onClick={handleDrawLine}>Draw line</button>
			</div>
	        
			
			<div style={{ position: 'relative' }}>
				<Document file={pdfFile}>
					<Page pageNumber={1} renderTextLayer={false} />
				</Document>
				
				<div style={{ position: 'absolute', top: 0, left: 0 }}>
					<Stage width={595} height={841}>
						<Layer>
							{lines.map((line, index) => (
								<Line
									key={index}
									points={line.points}
									stroke="green"
									strokeWidth={2}
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