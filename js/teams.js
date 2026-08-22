(function () {
  let selectedGroupId = null;
  let lastTeams = null;

  function generateTeams(students, numTeams, balanceLevel, balanceGender) {
    const teams = Array.from({ length: numTeams }, () => []);
    let pool = [...students];
    if (balanceLevel) {
      pool.sort((a, b) => b.level - a.level);
    } else {
      pool.sort(() => Math.random() - 0.5);
    }

    let dir = 1;
    let t = 0;
    pool.forEach((s) => {
      teams[t].push(s);
      t += dir;
      if (t === numTeams) {
        t = numTeams - 1;
        dir = -1;
      } else if (t < 0) {
        t = 0;
        dir = 1;
      }
    });

    if (balanceGender) {
      for (let iter = 0; iter < 20; iter++) {
        const counts = teams.map((team) => ({
          F: team.filter((s) => s.gender === "F").length,
          M: team.filter((s) => s.gender === "M").length,
        }));
        let maxDiff = 0;
        let from = -1;
        let to = -1;
        let genderKey = null;
        for (let i = 0; i < teams.length; i++) {
          for (let j = 0; j < teams.length; j++) {
            if (i === j) continue;
            const diffF = counts[i].F - counts[j].F;
            if (diffF > maxDiff) {
              maxDiff = diffF;
              from = i;
              to = j;
              genderKey = "F";
            }
            const diffM = counts[i].M - counts[j].M;
            if (diffM > maxDiff) {
              maxDiff = diffM;
              from = i;
              to = j;
              genderKey = "M";
            }
          }
        }
        if (maxDiff <= 1 || from === -1) break;
        const idx = teams[from].findIndex((s) => s.gender === genderKey);
        if (idx === -1) break;
        const [moved] = teams[from].splice(idx, 1);
        teams[to].push(moved);
      }
    }
    return teams;
  }

  function render(container) {
    container.innerHTML = "";
    const groups = Students.getGroups();
    if (!groups.length) {
      container.innerHTML = '<p class="muted">Créez d\'abord un groupe dans l\'onglet Élèves.</p>';
      return;
    }
    if (!selectedGroupId) selectedGroupId = groups[0].id;

    const form = document.createElement("form");
    form.className = "teams-form";
    form.innerHTML = `
      <select name="groupId">${groups.map((g) => `<option value="${g.id}" ${g.id === selectedGroupId ? "selected" : ""}>${g.name}</option>`).join("")}</select>
      <label>Nombre d'équipes <input type="number" name="numTeams" min="2" max="20" value="4" /></label>
      <label><input type="checkbox" name="balanceLevel" checked /> Équilibrer selon le niveau</label>
      <label><input type="checkbox" name="balanceGender" checked /> Équilibrer filles/garçons</label>
      <button class="btn btn-primary" type="submit">Générer les équipes</button>
    `;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      selectedGroupId = form.groupId.value;
      const students = Students.studentsInGroup(selectedGroupId);
      const numTeams = Math.max(2, Math.min(students.length || 2, Number(form.numTeams.value) || 4));
      lastTeams = generateTeams(students, numTeams, form.balanceLevel.checked, form.balanceGender.checked);
      renderTeams();
    });
    container.appendChild(form);

    const resultBox = document.createElement("div");
    resultBox.className = "teams-result";
    container.appendChild(resultBox);

    function renderTeams() {
      resultBox.innerHTML = "";
      if (!lastTeams) return;
      lastTeams.forEach((team, i) => {
        const card = document.createElement("div");
        card.className = "team-card";
        const avgLevel = team.length ? (team.reduce((sum, s) => sum + s.level, 0) / team.length).toFixed(1) : "-";
        const fCount = team.filter((s) => s.gender === "F").length;
        const mCount = team.filter((s) => s.gender === "M").length;
        card.innerHTML = `<h4>Équipe ${i + 1} <span class="muted">(niv. moy. ${avgLevel} · ${fCount}F/${mCount}M)</span></h4>
          <ul>${team.map((s) => `<li>${s.name}</li>`).join("")}</ul>`;
        resultBox.appendChild(card);
      });
    }
    renderTeams();
  }

  window.Teams = { render };
})();
