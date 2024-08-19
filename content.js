// Global variable to keep track of the currently active calculator button and Kendo NumericTextBox
let activeCalculatorButton = null;
let activeKendoNumericTextBox = null;
let inputElement = null; // To track the input element that triggered the calculator
let isDragging = false; // To track whether the calculator is being dragged
let offsetX, offsetY; // To track the offset when dragging

// Inject the calculator HTML into the page
function injectCalculatorHTML() {
  const calculatorHTML = `
      <div id="calculator" class="calculator-container" style="display: none;">
        <div class="calculator-header">
          <span>Calculator</span>
          <button class="close-calculator">✖</button>
        </div>
        <input type="text" class="calculator-screen" disabled id="calcInput"/>
        <div class="calculator-buttons">
          <button class="btncalc">CE</button>
          <button class="btncalc">C</button>
          <button class="btncalc">sqrt</button>
          <button class="btncalc">/</button>
          <button class="btncalc">7</button>
          <button class="btncalc">8</button>
          <button class="btncalc">9</button>
          <button class="btncalc">*</button>
          <button class="btncalc">4</button>
          <button class="btncalc">5</button>
          <button class="btncalc">6</button>
          <button class="btncalc">-</button>
          <button class="btncalc">1</button>
          <button class="btncalc">2</button>
          <button class="btncalc">3</button>
          <button class="btncalc">+</button>
          <button class="btncalc">0</button>
          <button class="btncalc">.</button>
          <button class="btncalc">=</button>
          <button class="btncalc">%</button>
          <button class="btncalc">Ok</button>
          <button class="btncalc">Cancel</button>
        </div>
      </div>
    `;

  // Inject the calculator HTML into the document body
  document.body.insertAdjacentHTML("beforeend", calculatorHTML);

  const calculator = document.getElementById("calculator");
  const screen = calculator.querySelector(".calculator-screen");
  const buttons = calculator.querySelectorAll(".btncalc");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.innerText.trim(); // Trim whitespace for reliable matching
  
      // Get the current equation parts to determine the last input
      const currentInput = screen.value.trim().split(" ");
      const lastInput = currentInput[currentInput.length - 1];
  
      // Prevent consecutive symbols
      const isLastInputSymbol = ["+", "-", "*", "/", "%"].includes(lastInput);
      const isCurrentInputSymbol = ["+", "-", "*", "/","%"].includes(value);
      if(value.includes('.') && lastInput.includes('.')){
        return;
      }
      // Ensure no consecutive symbols are added
      if (isLastInputSymbol && isCurrentInputSymbol) {
        return; // Prevent adding the current symbol if the last input was also a symbol
      }
  
      switch (value) {
        case "C":
          screen.value = "";
          break;
        case "CE":
          currentInput.pop(); // Remove the last entry (either a number or operator)
          screen.value = currentInput.join(" ");
          break;
        case "=":
        case "Ok":
          // Process the equation using custom PEMDAS logic
          const equation = screen.value.trim();
          if (equation) {
            const result = solveEquation(equation);
            screen.value = result;
  
            if (value === "Ok") {
              inputElement.value = result;
              const event = new Event("input", { bubbles: true });
              inputElement.dispatchEvent(event);
              calculator.style.display = "none";
            }
          }
          break;
        case "Cancel":
          calculator.style.display = "none";
          break;
        case "+/-":
          // Handle negation by toggling the last number's sign
          if (lastInput && !isNaN(lastInput)) {
            currentInput[currentInput.length - 1] = (parseFloat(lastInput) * -1).toString();
            screen.value = currentInput.join(" ");
          }
          break;
        default:
          // Append the value to the screen (with a space for separation)
          if(!isNaN(lastInput) && (!isNaN(value) || value === "." && !lastInput.includes("."))){
            screen.value += `${value}`;
          }
          else{
            screen.value += ` ${value}`;
          }
          screen.value = screen.value.trim(); // Ensure no leading/trailing spaces
          break;
      }
    });
  });
  // Function to calculate based on operator
  function solveEquation(equation) {
    let tokens = equation.split(" ");
  
    // Handle square root and percentage operations first
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === "sqrt") {
        const sqrtResult = Math.sqrt(parseFloat(tokens[i + 1]));
        tokens.splice(i, 2, sqrtResult); // Replace the "sqrt" and the number with the result
        i--; // Step back to re-evaluate the new tokens
      } else if (tokens[i] === "%") {
        const percentageResult = parseFloat(tokens[i - 1]) / parseFloat(tokens[i + 1]);
        tokens.splice(i - 1, 2, percentageResult); // Replace the number and "%" with the result
        i--; // Step back to re-evaluate the new tokens
      }
    }
  
    // Process multiplication and division next
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === "*" || tokens[i] === "/") {
        const result = operate(tokens[i - 1], tokens[i], tokens[i + 1]);
        tokens.splice(i - 1, 3, result); // Replace the operation with the result
        i--; // Step back to re-evaluate the new tokens
      }
    }
  
    // Process addition and subtraction last
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === "+" || tokens[i] === "-") {
        const result = operate(tokens[i - 1], tokens[i], tokens[i + 1]);
        tokens.splice(i - 1, 3, result); // Replace the operation with the result
        i--; // Step back to re-evaluate the new tokens
      }
    }
  
    return tokens[0]; // The final result
  }
  
  // Helper function to handle basic operations
  function operate(a, operator, b) {
    a = parseFloat(a);
    b = parseFloat(b);
    switch (operator) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        return a / b;
      default:
        return 0;
    }
  }
  // Handle closing the calculator
  document.querySelector(".close-calculator").addEventListener("click", () => {
    calculator.style.display = "none";
  });
  // Implement drag-and-drop functionality
  const header = calculator.querySelector(".calculator-header");

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - calculator.getBoundingClientRect().left;
    offsetY = e.clientY - calculator.getBoundingClientRect().top;

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", onStopDrag);
  });

  function onDrag(e) {
    if (isDragging) {
      calculator.style.left = `${e.clientX - offsetX}px`;
      calculator.style.top = `${e.clientY - offsetY}px`;
    }
  }

  function onStopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", onStopDrag);
  }
}

// Function to show and position the existing calculator element
function showCalculator(targetInput) {
    const calculator = document.getElementById("calculator"); // Reference the existing calculator
    const calcInput = document.getElementById("calcInput");
    calcInput.value = targetInput.value;
    if (!calculator) {
      console.error("Calculator element not found!");
      return;
    }
  
    const rect = targetInput.getBoundingClientRect();
    const calculatorWidth = calculator.offsetWidth;
    const calculatorHeight = calculator.offsetHeight;
  
    // Position the calculator near the target input
    let left = rect.right + 5;
    let top = rect.top;
  
    // Check if the calculator goes out of bounds and adjust accordingly
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
  
    // Adjust horizontal position if it goes beyond the right edge
    if (left + calculatorWidth > viewportWidth) {
      left = rect.left - calculatorWidth - 5;
    }
  
    // Adjust vertical position if it goes beyond the bottom edge
    if (top + calculatorHeight > viewportHeight) {
      top = viewportHeight - calculatorHeight - 10; // Leave some space from the bottom
    }
  
    // Apply the adjusted position
    calculator.style.left = `${left}px`;
    calculator.style.top = `${top}px`;
    calculator.style.display = "block"; // Make sure the calculator is visible
  
    // Handle closing the calculator
    document.querySelector(".close-calculator").addEventListener("click", () => {
      calculator.style.display = "none";
    });
  
    // Focus handling: clicking outside should close the calculator
    document.addEventListener(
      "click",
      (e) => {
        if (!calculator.contains(e.target) && e.target !== targetInput) {
          calculator.style.display = "none";
        }
      },
      { once: true }
    );
  }

// Function to insert or reposition the calculator button next to the focused Kendo NumericTextBox
function manageCalculatorButton(kendoNumericTextBox) {
    // Remove the previously active button
    if (activeCalculatorButton) {
      activeCalculatorButton.remove();
      activeCalculatorButton = null;
    }
  
    // Check if the button already exists to avoid duplicates
    if (!kendoNumericTextBox.parentElement.querySelector(".calculator-btncalc")) {
      // Create a wrapper to hold both the numeric textbox and the button
      const wrapper = document.createElement("div");
      wrapper.style.display = "inline-flex";
      wrapper.style.alignItems = "center";
      wrapper.style.position = "relative"; // Ensure the container is relative for positioning
  
      // Insert the wrapper before the kendoNumericTextBox
      kendoNumericTextBox.parentElement.insertBefore(wrapper, kendoNumericTextBox);
      
      // Move the kendoNumericTextBox inside the wrapper
      wrapper.appendChild(kendoNumericTextBox);
  
      // Create the button element
      const button = document.createElement("button");
      button.classList.add("calculator-btncalc");
      button.style.marginLeft = "5px"; // Add space between the textbox and the button
      button.style.marginBottom = "10%"; // Add space between the textbox and the button
      button.style.border = "none";
      button.style.background = "transparent";
      button.style.cursor = "pointer";
      button.style.zIndex = 10000; // Ensure it's on top of other elements
      button.style.padding = "0 10px";
  
      // Add the Font Awesome icon
      button.innerHTML = '<i class="fas fa-calculator"></i>'; // Font Awesome icon
  
      // Inject Font Awesome (if needed)
      if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesomeLink = document.createElement("link");
        fontAwesomeLink.href =
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
        fontAwesomeLink.rel = "stylesheet";
        fontAwesomeLink.setAttribute("data-font-awesome", "true");
        document.head.appendChild(fontAwesomeLink);
      }
  
      // Append the button to the wrapper
      wrapper.appendChild(button);
  
      // Attach event listener to show the calculator
      button.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevents the event from bubbling up and potentially causing interference
        inputElement = kendoNumericTextBox.querySelector("input");
        if (inputElement) {
          showCalculator(inputElement); // Show the existing calculator near the input
        }
      });
  
      // Track the active button and container
      activeCalculatorButton = button;
      activeKendoNumericTextBox = kendoNumericTextBox;
    }
  }
  
// Function to handle focus and blur events
function handleFocusBlur(event) {
  const kendoNumericTextBox = event.target.closest("kendo-numerictextbox");

  if (kendoNumericTextBox) {
    if (event.type === "focusin") {
      if (kendoNumericTextBox !== activeKendoNumericTextBox) {
        manageCalculatorButton(kendoNumericTextBox);
      }
    } else if (event.type === "focusout") {
      if (kendoNumericTextBox === activeKendoNumericTextBox) {
        // Check if the new focus target is the calculator button or not
        const relatedTarget = event.relatedTarget;
        if (
          !activeCalculatorButton ||
          (relatedTarget && activeCalculatorButton.contains(relatedTarget))
        ) {
          // If focus is moving to the calculator button or its child, do not remove it
          return;
        }

        // Remove the calculator button when focus is lost
        activeCalculatorButton?.remove();
        activeCalculatorButton = null;
        activeKendoNumericTextBox = null;
      }
    }
  }
}

// Inject the calculator when the content script loads
injectCalculatorHTML();

// Attach the event listener to the document for focusin and focusout
document.addEventListener("focusin", handleFocusBlur);
//document.addEventListener("focusout", handleFocusBlur);
