```
npm i
npm run start
```
This app loads the `src/sample.pdf` file in the PDF viewer.

* The width of the PDF is 595
* The height of the PDF is 842
* (x, y) co-ordinates from range (0, 0) to (595, 842) can be entered in the (x, y) textboxes and a blue line can be drawn on top of the PDF using the `Draw line` button
* Click anywhere on the PDF and draw freehand by clicking and releasing the left mouse button. It will draw a freehand annotation in blue colour. This action will also capture the points of the annotation in the `textarea`
* Annotations can be shown/hidden by toggling the `Hide annotations` or `Show annotations` button
* The `Draw Red Shape` button will be disabled when there are no annotations
* The `Draw Red Shape` button will be enabled when at least one annotation is added
* Clicking the `Draw Red Shape` button will draw a red annotation exactly on top of the LAST annotation added such that the old blue annotation wouldn't be visible. Multiple clicks will add a red annotation again and again
* Clicking the `Switch to eraser` button will activate the eraser mode. In this mode, annotations will be deleted on mouse click. If there are `n` red annotations added on top of the original blue annoation, `n+1` mouse clicks should be made to completely erase the annotations (`n` clicks to erase `n` red annotations and `1` click to remove the `1` blue annotation)
* When you are in eraser mode, you won't be able to draw annotations. If you want to draw annotations again, click the `Switch to drawing` button. This will activate the drawing mode
* Clicking the `Download PDF with annotations as image` (NOT RECOMMENDED) will convert whatever you see on the PDF viewer (with/without annotations) as an image and then download the image as a PDF. The quality of the output PDF file will be low in this case
* Clicking the `Download PDF with annotations` will download whatever you see on the PDF viewer (with/without annotations) as a PDF. The quality of the output PDF file will be high in this case

Note: Equivalent A4 paper dimensions in pixels at 300 DPI and 72 DPI respectively are: 2480 pixels x 3508 pixels (print resolution) 595 pixels x 842 pixels (screen resolution)

![image](https://github.com/user-attachments/assets/25e46ff6-c882-42d6-8f63-7afec2376485)

<ins>Tested with:<ins>

node - 20.5.0

npm - 9.8.0

react - 18.3.1

