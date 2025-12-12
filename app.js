const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


// hamburger menu toggle
// Mobile hamburger Menu
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('show');
      hamburger.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('show');
        hamburger.classList.remove('active');

      }
    });
    //   close menu when a link is clicked

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('show');
        hamburger.classList.remove('active');
      });
    });
  }
});
// Contact Form Validation
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const formMessage = document.getElementById("formMessage");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const company = document.getElementById("company").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const equipment = document.getElementById("equipment-select").value.trim();
      const start = document.getElementById("start").value.trim();
      const duration = document.getElementById("duration").value.trim();
      const location = document.getElementById("location").value.trim();
      const notes = document.getElementById("notes").value.trim();

      if (name && company && email && phone && equipment && start && duration && location && notes) {
        formMessage.textContent = "✅ Message sent successfully!";
        formMessage.style.color = "green";
        form.reset();
      } else {
        formMessage.textContent = "❌ Please fill all fields.";
        formMessage.style.color = "red";
      }
    });
  }
});

// Example equipment data
const equipmentData = [
  { model: "XCMG QY50", available: true },
  { model: "CAT D6", available: true },
  { model: "Komatsu PC210", available: true },
  { model: "Toyota 8FGCU25", available: true },
  { model: "Enerpac 100T Press", available: true }
  // Add more models as needed
];
// Moadal creation for check Availability button
document.addEventListener('DOMContentLoaded', function () {
  // Event delegation for dynamically rendered buttons
  document.body.addEventListener("click", function (e) {
    const btn = e.target.closest(".availability-btn");
    if (!btn) return;

    const model = btn.dataset.model;
    const found = equipmentData.find(item => item.model === model);

    if (found) {
      if (found.available) {
        showAvailabilityModal("Equipment Available ✅", `${model} is available for rent!`, "green");
      } else {
        showAvailabilityModal("Not Available ❌", `${model} is currently not available.`, "red");
      }
    } else {
      showAvailabilityModal("Not Found ❓", "This equipment is not in our database.", "gray");
    }
  });
});

// Modal creation function
function showAvailabilityModal(title, message, color) {
  closeAvailabilityModal(); // Remove any existing modal
  const html = `
    <div class="modal show">
      <div class="modal-content" style="border-top: 6px solid ${color}">
        <span class="close-btn" onclick="closeAvailabilityModal()" style="position:absolute;right:16px;top:16px;cursor:pointer;font-size:1.5rem;">&times;</span>
        <h2 style="margin-top:0;color:var(--text)">${title}</h2>
        <p style="color:var(--text)">${message}</p>
      </div>
    </div>
  `;
  const portal = document.createElement('div');
  portal.id = 'availability-modal-portal';
  portal.innerHTML = html;
  document.body.appendChild(portal);
  document.body.style.overflow = 'hidden';
}

function closeAvailabilityModal() {
  const portal = document.getElementById('availability-modal-portal');
  if (portal) portal.remove();
  document.body.style.overflow = '';
}

// // Newsletter subscription 
// function subscribeNewsletter(formElement) {
//   const emailInput = formElement.querySelector('input[type="email"]');
//   const responseElement = document.getElementById("response");

//   if (!emailInput || !emailInput.value) {
//     responseElement.textContent = "Please enter a valid email address";
//     responseElement.style.color = "red";
//     return;
//   }
//   responseElement.textContent = "Subscribing...";
//   responseElement.style.color = "var(--text)";
//   // Mailchimp API endpoint (replace with your actual list ID)
//   const listID = "1c94b56dee";
//   const dataCenter = "us10";
//   const url = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${listID}/members`;
//   // Your API Key should be stored securely
//   const apiKey = "a6484f636caf86f6cdcf37b72ee7673e-us10";
//   fetch('/subscribe', {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       email: emailInput.value
//     })
//   })
//    .then(response => {
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       return response.json();
//     })
//     .then(data => {
//       if (data.success) {
//         responseElement.textContent = data.message;
//         responseElement.style.color = "green";
//         emailInput.value = "";
//       } else {
//         responseElement.textContent = data.message;
//         responseElement.style.color = "red";
//       }
//     })
//     .catch(error => {
//       console.error("Subscription error:", error);
//       responseElement.textContent = "Failed to subscribe. Please try again later.";
//       responseElement.style.color = "red";
//     });
// }

//Newsletter subscription 
function subscribeNewsletter(formElement) {
  const emailInput = formElement.querySelector('input[type="email"]');
  const responseElement = document.getElementById("response");
  if (!emailInput || !emailInput.value) {
    responseElement.textContent = "Please enter a valid email address";
    responseElement.style.color = "red";
    return;
  }
  responseElement.textContent = "Subscribing...";
  responseElement.style.color = "var(--text)";
  fetch('http://localhost:4000/subscribe', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: emailInput.value
    })
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      });
    }
    return response.json();
  })

  .then(data => {
    responseElement.textContent = data.message || "Successfully subscribed!";
    responseElement.style.color = "green";
    emailInput.value = "";
  })
  .catch(error => {
    console.error("Subscription error:", error);
    responseElement.textContent = error.message || "Failed to subscribe. Please try again later.";
    responseElement.style.color = "red";
  });
}

// Gallery "Show more" toggle for products page
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('gallery-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const expanded = document.body.classList.toggle('gallery-expanded');
    toggle.textContent = expanded ? 'Show less' : 'Show more';
    toggle.setAttribute('aria-expanded', expanded);
  });
});

