// import React, { useState } from "react";


// export default function BulkTools() {
//   const [workingSet, setWorkingSet] = useState("Medicines & products");

//   return (
//     <div className="bulk-tools-page">

//       {/* Working Set */}
//       <div className="bulk-working-set">
//         <span className="bulk-working-label">Working set:</span>

//         <button
//           className={`bulk-tab ${
//             workingSet === "Medicines & products" ? "active" : ""
//           }`}
//           onClick={() => setWorkingSet("Medicines & products")}
//         >
//           Medicines & products
//         </button>

//         <button
//           className={`bulk-tab ${
//             workingSet === "inventory" ? "active" : ""
//           }`}
//           onClick={() => setWorkingSet("inventory")}
//         >
//           inventory
//         </button>

//         <button
//           className={`bulk-tab ${
//             workingSet === "doctors" ? "active" : ""
//           }`}
//           onClick={() => setWorkingSet("doctors")}
//         >
//           doctors
//         </button>

//         <button className="bulk-tab">
//           Export CSV
//         </button>
//       </div>

//       {/* Target Filter */}
//       <div className="bulk-card">
//         <h3>Target filter</h3>

//         <p>
//           Leave blank to apply to every row in products.
//           Filters combine (AND).
//         </p>

//         <div className="bulk-filter-grid">
//           <input placeholder="Pin code" />

//           <input placeholder="Seller id (optional)" />

//           <input placeholder="Category id (products only)" />
//         </div>
//       </div>

//       {/* Bulk Operations */}
//       <div className="bulk-operation-grid">

//         {/* Mass Stock */}
//         <div className="bulk-card">
//           <h3>Mass stock update</h3>

//           <p>
//             Updates products.stock_quantity.
//           </p>

//           <div className="bulk-input-row">
//             <select>
//               <option value="add">Add units</option>
//               <option value="subtract">Subtract units</option>
//               <option value="set">Set to</option>
//             </select>

//             <input
//               type="number"
//               defaultValue="10"
//             />
//           </div>

//           <button className="bulk-primary-btn">
//             Apply stock change
//           </button>
//         </div>

//         {/* Mass Price */}
//         <div className="bulk-card">
//           <h3>Mass price update</h3>

//           <p>
//             Applies to medicines, pet food and accessories.
//           </p>

//           <div className="bulk-input-row">
//             <select>
//               <option value="percent">Change by %</option>
//               <option value="amount">Change by ₹</option>
//               <option value="set">Set price to ₹</option>
//             </select>

//             <input
//               type="number"
//               defaultValue="-5"
//             />
//           </div>

//           <label className="bulk-checkbox">
//             <input
//               type="checkbox"
//               defaultChecked
//             />

//             <span>
//               Recalculate discount % against MRP
//             </span>
//           </label>

//           <button className="bulk-primary-btn">
//             Apply price change
//           </button>
//         </div>

//         {/* Assign Pin Code */}
//         <div className="bulk-card">
//           <h3>Assign pin code in bulk</h3>

//           <p>
//             Tag the filtered products rows to a
//             serviceable pin code.
//           </p>

//           <input
//             className="bulk-full-input"
//             placeholder="e.g. 560076"
//           />

//           <div className="bulk-button-row">
//             <button className="bulk-primary-btn">
//               Assign pin code
//             </button>

//             <button className="bulk-secondary-btn">
//               Activate
//             </button>

//             <button className="bulk-secondary-btn">
//               Deactivate
//             </button>
//           </div>
//         </div>

//         {/* CSV / JSON */}
//         <div className="bulk-card">
//           <h3>CSV / JSON import</h3>

//           <p>
//             First row = column names. Include an id column
//             to update existing rows, omit it to create new
//             ones. Example:
//           </p>

//           <textarea
//             spellCheck="false"
//             placeholder={`name,price,mrp,pincode,stock_quantity
// Calcium Syrup 200ml,320,399,560076,50`}
//           />

//           <div className="bulk-file-row">
//             <input
//               type="file"
//               accept=".csv,.json,text/csv"
//             />

//             <button className="bulk-primary-btn">
//               Import into products
//             </button>
//           </div>
//         </div>

//       </div>

//       {/* Activity Log */}
//       <div className="bulk-card">
//         <h3>Activity log</h3>

//         <div className="bulk-activity">
//           No bulk actions yet.
//         </div>
//       </div>

//     </div>
//   );
// }