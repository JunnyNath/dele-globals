function sendMail() {
    var params = {
        name: document.getElementById("name").value,
        company: document.getElementById("company").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        equipment: document.getElementById("equipment-select").value,
        start: document.getElementById("start").value,
        duration: document.getElementById("duration").value,
        location: document.getElementById("location").value,
        notes: document.getElementById("notes").value,
    };


    
    const serviceID = "service_vhad54n";
    const templateID = "template_nxq6yjh";

    emailjs.send(serviceID, templateID, params)
        .then((res) => {
            document.getElementById("name").value = "";
            document.getElementById("company").value = "";
            document.getElementById("email").value = "";
            document.getElementById("phone").value = "";
            document.getElementById("equipment-select").value = "";
            document.getElementById("start").value = "";
            document.getElementBy("duration").value = "";
            document.getElementById("location").value = "";
            document.getElementById("notes").value = "";
            console.log(res);
            alert("Message sent successfully!");
        })
        .catch((err) => console.log(err));

}

