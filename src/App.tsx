import { useState, useEffect } from "react";
import "./App.css";
import { OCRClient } from "tesseract-wasm";

const pdfjsLib = window.pdfjsLib;

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | undefined>(undefined);

  useEffect(() => {
    if (!uploadedFile) {
      return;
    }

    async function asyncFunction() {
      console.log("uploadedFile", uploadedFile);

      const fileReader = new FileReader();

      fileReader.onload = function () {
        //Step 4:turn array buffer into typed array
        console.log("fileReader", fileReader);
        console.log("fileReader.result", fileReader.result);
        const typedarray = new Uint8Array(fileReader.result);

        //Step 5:pdfjs should be able to read this
        const loadingTask = pdfjsLib.getDocument(typedarray);
        loadingTask.promise.then((pdf) => {
          pdf.getPage(3).then(function (page) {
            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });
            // Support HiDPI-screens.
            const outputScale = window.devicePixelRatio || 1;

            const canvas = document.getElementById("the-canvas");
            if (!canvas) return;
            const context = (canvas as HTMLCanvasElement).getContext("2d");
            if (!context) return;

            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + "px";
            canvas.style.height = Math.floor(viewport.height) + "px";

            const transform =
              outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            const renderContext = {
              canvasContext: context,
              transform: transform,
              viewport: viewport,
            };
            page.render(renderContext);

            // Initialize the OCR engine. This will start a Web Worker to do the
            // work in the background.
            const ocr = new OCRClient();

            // Load the appropriate OCR training data for the image(s) we want to
            // process.
            ocr.loadModel("eng.traineddata").then(() => {
              console.log("LOADED");
              const myImageData = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              ).data;
              ocr.loadImage(myImageData).then(() => {
                // Perform text recognition and return text in reading order.
                ocr.getText().then((text) => {
                  ocr.destroy();
                });
              });
            });
            // Once all OCR-ing has been done, shut down the Web Worker and free up
            // resources.
          });
        });
      };
      //Step 3:Read the file as ArrayBuffer
      fileReader.readAsArrayBuffer(uploadedFile);
    }

    asyncFunction();
  }, [uploadedFile]);

  return (
    <>
      <input
        type="file"
        onChange={(e) => {
          setUploadedFile(e.target.files?.[0]);
        }}
      />
    </>
  );
}

export default App;
