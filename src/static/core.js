function loadNewResearch() {
	// Initial state based on potential pre-checked (though it's not by default here)
	document.addEventListener("DOMContentLoaded", () => {
		const useAutoRagCheckbox = document.getElementById("use_autorag_checkbox");
		if (useAutoRagCheckbox) {
			toggleAutoRagDropdown(useAutoRagCheckbox.checked);
		}
	});

	// HTMX event handlers
	document.addEventListener("htmx:beforeRequest", (evt) => {
		const query = document.getElementById("initial-query").value.trim();
		if (!query) {
			evt.preventDefault();
			alert("Please enter a research question before proceeding.");
			return;
		}

		// Disable the button during request
		document.getElementById("generate-questions-btn").disabled = true;
	});

	document.addEventListener("htmx:afterRequest", (evt) => {
		// Re-enable the button
		document.getElementById("generate-questions-btn").disabled = false;

		if (evt.detail.successful) {
			// Scroll to follow-up section
			document.getElementById("followup-section").scrollIntoView({
				behavior: "smooth",
				block: "start",
			});

			// Set up the final form
			setupFinalForm();
		} else {
			console.error("Error generating questions:", evt.detail.xhr.responseText);
			alert("Failed to generate questions. Please try again.");
		}
	});

	function setupFinalForm() {
		const originalQuery = document.getElementById("initial-query").value;
		document.getElementById("original-query-hidden").value = originalQuery;
		const originalDepth = document.getElementById("initial-depth").value;
		document.getElementById("depth-hidden").value = originalDepth;
		const originalBreadth = document.getElementById("initial-breadth").value;
		document.getElementById("breadth-hidden").value = originalBreadth;
		const initialLearnings = document.getElementById("initial-learnings").value;
		document.getElementById("initial-learnings-hidden").value =
			initialLearnings;

		// Add event listener to start research button when it's created
		setTimeout(() => {
			const startBtn = document.getElementById("start-research-btn");
			if (startBtn) {
				startBtn.addEventListener("click", (e) => {
					e.preventDefault();

					// Validate all questions are answered
					const questions = document.querySelectorAll(
						"#followup-section input, #followup-section textarea, #followup-section select",
					);
					let allAnswered = true;

					questions.forEach((question) => {
						if (!question.value.trim()) {
							allAnswered = false;
							question.classList.add("border-red-500");
						} else {
							question.classList.remove("border-red-500");
						}
					});

					if (!allAnswered) {
						alert("Please answer all questions before starting the research.");
						return;
					}

					// Show loading state
					startBtn.disabled = true;
					startBtn.innerHTML = `
                            <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Starting Research...
                        `;

					// Copy all question answers to final form
					const finalForm = document.getElementById("final-form");

					// Clear existing question fields
					const existingFields = finalForm.querySelectorAll(
						'input[name^="question_"], input[name^="answer_"]',
					);
					existingFields.forEach((field) => {
						field.remove();
					});

					// Add questions and answers
					questions.forEach((input, _index) => {
						const questionText = input
							.closest(".question-item")
							.querySelector(".question-text").textContent;

						// Add question
						const questionField = document.createElement("input");
						questionField.type = "hidden";
						questionField.name = `question`;
						questionField.value = questionText;
						finalForm.appendChild(questionField);

						// Add answer
						const answerField = document.createElement("input");
						answerField.type = "hidden";
						answerField.name = `answer`;
						answerField.value = input.value;
						finalForm.appendChild(answerField);
					});

					// Ensure browse_internet and autorag_id are included in the final submission
					const browseInternetCheckbox = document.getElementById(
						"browse_internet_checkbox",
					);
					if (browseInternetCheckbox) {
						const browseInternetField = document.createElement("input");
						browseInternetField.type = "hidden";
						browseInternetField.name = "browse_internet";
						browseInternetField.value = browseInternetCheckbox.checked
							? "on"
							: "off";
						finalForm.appendChild(browseInternetField);
					}

					const useAutoRagCheckbox = document.getElementById(
						"use_autorag_checkbox",
					);
					const autoRagSelect = document.getElementById("autorag_id_select");
					if (
						useAutoRagCheckbox &&
						autoRagSelect &&
						useAutoRagCheckbox.checked
					) {
						const autoRagIdField = document.createElement("input");
						autoRagIdField.type = "hidden";
						autoRagIdField.name = "autorag_id";
						autoRagIdField.value = autoRagSelect.value;
						finalForm.appendChild(autoRagIdField);
					} else {
						// If not using AutoRAG, ensure we send an empty value if the field is expected
						// or make sure no old value is lingering if the field was dynamically added before
						// For this case, sending "" for autorag_id will be converted to null by the backend.
						const autoRagIdField = document.createElement("input");
						autoRagIdField.type = "hidden";
						autoRagIdField.name = "autorag_id";
						autoRagIdField.value = "";
						finalForm.appendChild(autoRagIdField);
					}

					// Submit the final form
					finalForm.submit();
				});
			}
		}, 100);
	}

	// Handle textarea auto-resize
	document.addEventListener("input", (e) => {
		if (e.target.tagName === "TEXTAREA") {
			e.target.style.height = "auto";
			e.target.style.height = e.target.scrollHeight + "px";
		}
	});
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
		anchor.addEventListener("click", function (e) {
			e.preventDefault();
			document.querySelector(this.getAttribute("href"))?.scrollIntoView({
				behavior: "smooth",
			});
		});
	});
});

function loadResearchList() {
	// Add interactive functionality
	document.addEventListener("DOMContentLoaded", () => {
		initSearchAndFilter();
	});
}

// Initialize search and filter functionality
function initSearchAndFilter() {
	const searchInput = document.getElementById("search-input");
	const statusFilter = document.getElementById("status-filter");
	const sortBy = document.getElementById("sort-by");

	// Read current URL params and set initial values
	const urlParams = new URLSearchParams(window.location.search);
	if (searchInput && urlParams.get("q")) {
		searchInput.value = urlParams.get("q");
	}
	if (statusFilter && urlParams.get("status")) {
		statusFilter.value = urlParams.get("status");
	}
	if (sortBy && urlParams.get("sort")) {
		sortBy.value = urlParams.get("sort");
	}

	// Debounce function for search
	let searchTimeout;
	function debounce(fn, delay) {
		return function (...args) {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => fn.apply(this, args), delay);
		};
	}

	// Update URL and refresh list
	function applyFilters() {
		const params = new URLSearchParams();
		const page = urlParams.get("page");
		if (page) params.set("page", "1"); // Reset to page 1 when filtering

		if (searchInput?.value.trim()) {
			params.set("q", searchInput.value.trim());
		}
		if (statusFilter?.value) {
			params.set("status", statusFilter.value);
		}
		if (sortBy?.value) {
			params.set("sort", sortBy.value);
		}

		const queryString = params.toString();
		window.location.href = queryString ? `/?${queryString}` : "/";
	}

	// Search with debounce (300ms delay)
	if (searchInput) {
		searchInput.addEventListener(
			"input",
			debounce(() => {
				applyFilters();
			}, 500),
		);
		// Also trigger on Enter key
		searchInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				applyFilters();
			}
		});
	}

	// Instant filter on select change
	if (statusFilter) {
		statusFilter.addEventListener("change", applyFilters);
	}
	if (sortBy) {
		sortBy.addEventListener("change", applyFilters);
	}
}

// Helper function to get CSRF token from cookie
function getCsrfToken() {
	const cookie = document.cookie
		.split("; ")
		.find((row) => row.startsWith("__csrf="));
	return cookie ? cookie.split("=")[1] : "";
}

// Helper function to add CSRF token to a form
function addCsrfToForm(form) {
	const csrfField = document.createElement("input");
	csrfField.type = "hidden";
	csrfField.name = "_csrf";
	csrfField.value = getCsrfToken();
	form.appendChild(csrfField);
}

function rerun(id) {
	if (confirm("Are you sure you want to rerun this item?")) {
		const form = document.createElement("form");
		form.method = "POST";
		form.action = "/re-run";

		addCsrfToForm(form);

		const idField = document.createElement("input");
		idField.type = "hidden";
		idField.name = "id";
		idField.value = id;

		form.appendChild(idField);
		document.body.appendChild(form);
		form.submit();
	}
}

function deleteItem(id) {
	if (confirm("Are you sure you want to delete this item?")) {
		const form = document.createElement("form");
		form.method = "POST";
		form.action = "/delete";

		addCsrfToForm(form);

		const idField = document.createElement("input");
		idField.type = "hidden";
		idField.name = "id";
		idField.value = id;

		form.appendChild(idField);
		document.body.appendChild(form);
		form.submit();
	}
}

function toggleDropdown(id) {
	const dropdownElement = document.getElementById(`download-dropdown-${id}`);
	if (dropdownElement) {
		dropdownElement.classList.toggle("hidden");
	}
}

function toggleAutoRagDropdown(checked) {
	const dropdown = document.getElementById("autorag_id_dropdown_container");
	if (dropdown) {
		dropdown.style.display = checked ? "block" : "none";
	}
	const selectElement = document.getElementById("autorag_id_select");
	if (selectElement) {
		selectElement.disabled = !checked;
		if (!checked) {
			selectElement.value = ""; // Clear selection when hiding
		}
	}
}

// ============================================
// Dark Mode
// ============================================

function toggleDarkMode() {
	const isDark = document.documentElement.classList.toggle("dark");
	localStorage.setItem("darkMode", isDark ? "true" : "false");
}

// ============================================
// Depth/Breadth Presets
// ============================================

function applyPreset(depth, breadth) {
	const depthInput = document.getElementById("initial-depth");
	const breadthInput = document.getElementById("initial-breadth");
	if (depthInput) depthInput.value = depth;
	if (breadthInput) breadthInput.value = breadth;

	// Update preset button styles
	document.querySelectorAll("[data-preset]").forEach((btn) => {
		btn.classList.remove("ring-2", "ring-blue-500");
	});
	const activeBtn = document.querySelector(
		`[data-preset="${depth}-${breadth}"]`,
	);
	if (activeBtn) {
		activeBtn.classList.add("ring-2", "ring-blue-500");
	}
}

// ============================================
// Keyboard Shortcuts
// ============================================

let shortcutsModalOpen = false;

function showShortcutsModal() {
	const modal = document.getElementById("shortcuts-modal");
	if (modal) {
		modal.classList.remove("hidden");
		shortcutsModalOpen = true;
	}
}

function hideShortcutsModal() {
	const modal = document.getElementById("shortcuts-modal");
	if (modal) {
		modal.classList.add("hidden");
		shortcutsModalOpen = false;
	}
}

document.addEventListener("keydown", (e) => {
	// Don't trigger shortcuts when typing in inputs
	if (
		e.target.tagName === "INPUT" ||
		e.target.tagName === "TEXTAREA" ||
		e.target.tagName === "SELECT"
	) {
		// Allow Escape to close modal even when in input
		if (e.key === "Escape" && shortcutsModalOpen) {
			hideShortcutsModal();
		}
		return;
	}

	// ? - Show shortcuts help
	if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
		e.preventDefault();
		if (shortcutsModalOpen) {
			hideShortcutsModal();
		} else {
			showShortcutsModal();
		}
	}

	// Escape - Close modal
	if (e.key === "Escape") {
		hideShortcutsModal();
	}

	// n - New research
	if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
		e.preventDefault();
		window.location.href = "/create";
	}

	// h or g h - Go home
	if (e.key === "h" && !e.ctrlKey && !e.metaKey) {
		e.preventDefault();
		window.location.href = "/";
	}

	// Ctrl/Cmd + d - Toggle dark mode
	if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
		e.preventDefault();
		toggleDarkMode();
	}

	// j/k - Navigate list items
	if ((e.key === "j" || e.key === "k") && !e.ctrlKey && !e.metaKey) {
		const items = document.querySelectorAll('[href^="/details/"]');
		if (items.length === 0) return;

		e.preventDefault();
		const focused = document.activeElement;
		let currentIndex = -1;

		items.forEach((item, index) => {
			if (item === focused || item.closest(".hover\\:bg-gray-50") === focused) {
				currentIndex = index;
			}
		});

		let nextIndex;
		if (e.key === "j") {
			nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
		} else {
			nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
		}

		items[nextIndex].focus();
	}

	// Enter - Follow focused link
	if (e.key === "Enter" && document.activeElement.tagName === "A") {
		document.activeElement.click();
	}

	// / - Focus search (if exists)
	if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
		const searchInput = document.querySelector('input[type="search"]');
		if (searchInput) {
			e.preventDefault();
			searchInput.focus();
		}
	}
});

// Create shortcuts modal on page load
document.addEventListener("DOMContentLoaded", () => {
	// Create modal if it doesn't exist
	if (!document.getElementById("shortcuts-modal")) {
		const modal = document.createElement("div");
		modal.id = "shortcuts-modal";
		modal.className =
			"hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
		modal.innerHTML = `
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
					<button onclick="hideShortcutsModal()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
				<div class="space-y-3 text-sm">
					<div class="flex justify-between text-gray-700 dark:text-gray-300">
						<span>New research</span>
						<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">n</kbd>
					</div>
					<div class="flex justify-between text-gray-700 dark:text-gray-300">
						<span>Go home</span>
						<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">h</kbd>
					</div>
					<div class="flex justify-between text-gray-700 dark:text-gray-300">
						<span>Toggle dark mode</span>
						<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+D</kbd>
					</div>
					<div class="flex justify-between text-gray-700 dark:text-gray-300">
						<span>Navigate list</span>
						<span>
							<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">j</kbd>
							<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded ml-1">k</kbd>
						</span>
					</div>
					<div class="flex justify-between text-gray-700 dark:text-gray-300">
						<span>Show this help</span>
						<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">?</kbd>
					</div>
					<div class="flex justify-between text-gray-700 dark:text-gray-300">
						<span>Close modal</span>
						<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
					</div>
				</div>
			</div>
		`;
		modal.addEventListener("click", (e) => {
			if (e.target === modal) hideShortcutsModal();
		});
		document.body.appendChild(modal);
	}

	// Initialize search and filter if on the list page
	if (document.getElementById("search-input")) {
		initSearchAndFilter();
	}
});
