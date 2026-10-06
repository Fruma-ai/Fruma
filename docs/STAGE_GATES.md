# Stage gates

A garment still goes concept → materials → pattern → sample → cut → sew → finish → inspect → ship. That chain is physical. The delay in it is mostly information: the brief is not searchable, the mill book is not mapped, commercials on the file look current when they are not, and the label is typed again at the end.

Fruma’s value is the data already sitting in factory files. Agents clear the information gates. They do not replace the floor.

| Stage | Who acts | What the data does | What stays physical |
| --- | --- | --- | --- |
| 1. Design and concept | Brief | The brief becomes the requirement contract: end product, colour as must or explicitly open, what is still unknown. That is the start of a tech pack. | Measurements, stitches, grades. Not guessed. |
| 2. Materials | Retrieval, evidence, commercial | Search mill fabric books for cloth that can become the product. Cite the cells. Keep file MOQ historical until the mill timestamps current terms. Organic fibre is not GOTS. | The mill’s own stock check, beyond what they confirm. |
| 3. Pattern and grading | None | Width, weight, and construction on the locked quality are the constraints handed to the pattern room. | Making and grading the pattern. |
| 4. Sample | None | The sample is requested against the locked article, so sampling is not a new search. Fit notes can return as facts. | Fit, on a body. |
| 5. Cutting | None | Width on file is the waste constraint. Missing width stays missing. | Marker, cutter, lay. |
| 6. Sewing | None | Construction as written is context for the line. | The line. |
| 7. Labels and finishing | Destination | Fibre for the content label is copied from the mill file. | Pressing, trimming, and any care sentence nobody has supplied. |
| 8. Inspection | Evidence, read-only | Fibre and claim scope can be checked against the record. A claim gap stays a gap. | Seams, measurements, wear. A complete record is not a QC pass. |
| 9. Pack and ship | None | The carton declares the same fibre as the label, from the same record. | Freight and packing. |

Code: `lib/fruma/gates.ts`. A gate Fruma does not own cannot come back as ready.

The speed compounds when the next style hits the same mill book: the header map, the confirmed commercials, and the excluded mills are already there. The floor still makes the sample.
