import React from 'react';
import PDFViewer from './PDFViewer';
import samplePdf from './sample.pdf';
import './App.css';

const App = () => {
  return (
    <div>
      <h1>Simple PDF Viewer with line drawing</h1>
      <PDFViewer pdfFile={samplePdf} />
      
    </div>
  )
}

export default App;
