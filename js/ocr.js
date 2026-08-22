(function () {
  function openImportModal() {
    const modal = document.getElementById("ocr-modal");
    modal.classList.add("open");
    const fileInput = modal.querySelector("#ocr-file-input");
    const resultBox = modal.querySelector("#ocr-result");
    const status = modal.querySelector("#ocr-status");
    resultBox.value = "";
    status.textContent = "";
    fileInput.value = "";

    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (typeof Tesseract === "undefined") {
        status.textContent = "Le moteur de reconnaissance n'a pas pu se charger (connexion internet requise).";
        return;
      }
      status.textContent = "Analyse de l'image en cours…";
      resultBox.value = "";
      try {
        const { data } = await Tesseract.recognize(file, "fra");
        resultBox.value = data.text;
        status.textContent =
          "Texte reconnu. Copiez les informations pertinentes dans votre horaire ou vos notes — la reconnaissance n'est pas garantie à 100 %, vérifiez avant de vous y fier.";
      } catch (err) {
        status.textContent = "Erreur lors de la reconnaissance : " + err.message;
      }
    };

    modal.querySelector(".modal-close").onclick = () => modal.classList.remove("open");
  }

  window.Ocr = { openImportModal };
})();
