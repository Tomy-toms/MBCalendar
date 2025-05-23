const token = localStorage.getItem('authToken');
  if (!token) {
      window.location.href = 'login.html'; // 🔒 redirige si non connecté
  }

  // Variables globales
  let autoSaveInterval = 0; // En secondes
  let autoSaveTimer = null;
  let currentWeek = getCurrentWeek();
  let currentYear = new Date().getFullYear();
  let currentMode = 'livraisons'; // 'livraisons' ou 'poseurs'
  let selectedTaskElement = null;
  const API_URL = 'http://localhost:3000'
  
  // Données de base de l'application
  let appData = {
      poseurs: [],
      livreurs: [],
      chantier: [],
      tasks: []
  };

  // Autentification
  function authFetch(url, options = {}) {
      const token = localStorage.getItem('authToken');
      if (!token) {
          showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
          setTimeout(() => window.location.href = 'login.html', 1500);
          return Promise.reject('Token manquant');
      }
      
      const headers = {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          ...(options.headers || {})
      };
      
      return fetch(url, {
          ...options,
          headers
      }).then(async res => {
          if (res.status === 401) {
              showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'error');
              localStorage.removeItem('authToken');
              setTimeout(() => window.location.href = 'login.html', 1500);
              throw new Error('Token invalide ou expiré');
          }
          
          if (res.status === 403) {
              // Erreur d'autorisation
              const errorData = await res.json().catch(() => ({ error: 'Accès refusé' }));
              throw new Error(errorData.error || 'Accès refusé');
          }
          
          if (!res.ok) {
              // Autres erreurs HTTP
              const errorData = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
              throw new Error(errorData.error || `Erreur ${res.status}`);
          }
          
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
              return res.json();
          } else {
              return res.text();
          }
      });
  }

  // Chargement des utilisateurs
  async function loadUsers() {
      try {
          console.log('Début du chargement des utilisateurs...');
          const users = await authFetch('/users');
          console.log('Utilisateurs reçus:', users);
          
          // Vérifier que users est bien un tableau
          if (!Array.isArray(users)) {
              console.error('La réponse n\'est pas un tableau:', users);
              throw new Error('Format de réponse invalide');
          }
          
          const list = document.getElementById('user-list');
          if (!list) {
              console.error('Élément user-list non trouvé');
              return;
          }
          
          list.innerHTML = '';
          const currentUser = parseJwt(localStorage.getItem('authToken'));
          
          // Le filtrage est déjà fait côté serveur, mais on peut faire un double check
          const filteredUsers = users.filter(user => {
              if (user.id === currentUser.userId) return false; // Masquer soi-même (sécurité)
              if (currentUser.role === 'admin' && user.role === 'developpeur') return false; // Masquer développeur
              return true;
          });
          
          console.log('Utilisateurs filtrés:', filteredUsers);
          
          filteredUsers.forEach(user => {
              const option = document.createElement('option');
              option.value = user.id;
              option.textContent = `${user.lastname || ''} ${user.firstname || ''} (${user.role || 'N/A'})`.trim();
              list.appendChild(option);
          });
          
          console.log(`${filteredUsers.length} utilisateurs chargés`);
          
      } catch (err) {
          console.error('Erreur lors du chargement des utilisateurs:', err);
          showNotification('Erreur lors du chargement des utilisateurs: ' + err.message, 'error');
      }
  }

  // TÂCHES
  function addTask(task) {
      return authFetch('/tasks', {
          method: 'POST',
          body: JSON.stringify(task)
      });
  }

  function updateTask(task) {
      return authFetch(`/tasks/${task.id}`, {
          method: 'PUT',
          body: JSON.stringify(task)
      });
  }

  function deleteTask(taskId) {
      return authFetch(`/tasks/${taskId}`, {
          method: 'DELETE'
      });
  }

  // LIVREURS
  function addLivreur(livreur) {
      return authFetch('/livreurs', {
          method: 'POST',
          body: JSON.stringify(livreur)
      });
  }

  function updateLivreur(livreur) {
      return authFetch(`/livreurs/${livreur.id}`, {
          method: 'PUT',
          body: JSON.stringify(livreur)
      });
  }

  function deleteLivreur(id) {
      return authFetch(`/livreurs/${id}`, {
          method: 'DELETE'
      });
  }

  // POSEURS
  function addPoseur(poseur) {
      return authFetch('/poseurs', {
          method: 'POST',
          body: JSON.stringify(poseur)
      });
  }

  function updatePoseur(poseur) {
      return authFetch(`/poseurs/${poseur.id}`, {
          method: 'PUT',
          body: JSON.stringify(poseur)
      });
  }

  function deletePoseur(id) {
      return authFetch(`/poseurs/${id}`, {
          method: 'DELETE'
      });
  }

  // CHANTIERS
  function addChantier(chantier) {
      return authFetch('/chantiers', {
          method: 'POST',
          body: JSON.stringify(chantier)
      });
  }

  function updateChantier(chantier) {
      return authFetch(`/chantiers/${chantier.id}`, {
          method: 'PUT',
          body: JSON.stringify(chantier)
      });
  }

  function deleteChantier(id) {
      return authFetch(`/chantiers/${id}`, {
          method: 'DELETE'
      });
  }

  
  // Fonction pour obtenir la date actuelle et calculer les dates de la semaine
  function getCurrentDate() {
      return new Date();
  }

  function getWeekDates(year, week) {
      // Calcule les dates pour une semaine donnée (compatible avec votre système)
      const firstDayOfYear = new Date(year, 0, 1);
      const days = (week - 1) * 7;
      const weekStart = new Date(firstDayOfYear);
      weekStart.setDate(firstDayOfYear.getDate() + days - firstDayOfYear.getDay() + 1);
      
      const dates = [];
      for (let i = 0; i < 5; i++) {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + i);
          dates.push(date);
      }
      return dates;
  }

  function isPastDate(year, week, day) {
      const today = getCurrentDate();
      const weekDates = getWeekDates(year, week);
      const dayDate = weekDates[day - 1]; // day est 1-indexé
      
      return dayDate < today.setHours(0, 0, 0, 0);
  }

  // Fonction pour obtenir le numéro de semaine actuel
  function getCurrentWeek() {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
      const oneDay = 1000 * 60 * 60 * 24;
      const day = Math.floor(diff / oneDay);
      
      // Calculer le numéro de semaine correctement selon la norme ISO
      // La semaine 1 est celle qui contient le premier jeudi de l'année
      const dayOfWeek = start.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const weekNumber = Math.ceil((day + dayOfWeek) / 7);
      
      return weekNumber;
  }

  // Configurer la sauvegarde automatique
  function setupAutoSave() {
      // Effacer le timer précédent s'il existe
      if (autoSaveTimer) {
          clearInterval(autoSaveTimer);
          autoSaveTimer = null;
      }
      
      // Si l'intervalle est supérieur à 0, configurer un nouveau timer
      if (autoSaveInterval > 0) {
          autoSaveTimer = setInterval(() => {
              showNotification('Sauvegarde automatique effectuée', 'success');
          }, autoSaveInterval * 1000);
      }
  }
  
  // Chargement des données depuis le stockage local
  async function loadData() {
      try {
          const [tasksRes, livreursRes, poseursRes, chantiersRes] = await Promise.all([
              authFetch('/tasks'),
              authFetch('/livreurs'),
              authFetch('/poseurs'),
              authFetch('/chantiers')
          ]);

          appData.tasks = tasksRes;
          appData.livreurs = livreursRes;
          appData.poseurs = poseursRes;
          appData.chantiers = chantiersRes;

          updateCalendar();
      } catch (error) {
          console.error("Erreur lors du chargement des données :", error);
      }
  }

  function updateTaskDayOptions() {
      const taskDaySelect = document.getElementById('task-day');
      taskDaySelect.innerHTML = ''; // Vider les anciennes options

      // Déterminer le lundi de la semaine sélectionnée
      const firstDayOfYear = new Date(currentYear, 0, 1);
      const dayOfWeek = firstDayOfYear.getDay();
      const offset = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1);
      const firstMonday = new Date(currentYear, 0, 1 + offset);
      const mondayOfWeek = new Date(firstMonday);
      mondayOfWeek.setDate(firstMonday.getDate() + (currentWeek - 1) * 7);

      const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

      for (let i = 0; i < 5; i++) {
          const date = new Date(mondayOfWeek);
          date.setDate(mondayOfWeek.getDate() + i);
          const option = document.createElement('option');
          option.value = (i + 1).toString(); // 1 à 5
          option.textContent = `${dayNames[i]} ${date.getDate()}`;
          taskDaySelect.appendChild(option);
      }
  }

  // Mettre à jour la liste des livreurs dans le sélecteur
  function updateLivreurSelector() {
      const livreurSelector = document.getElementById('livreur-selector');
      const livreurSelect = document.getElementById('selected-livreur');

      // Masquer si aucun livreur
      if (appData.livreurs.length === 0) {
          livreurSelector.style.display = 'none';
          return;
      }

      // Afficher si des livreurs existent
      if (currentMode === 'livraisons') {
          livreurSelector.style.display = 'flex';
      }

      // Sauvegarder la sélection actuelle
      const currentValue = livreurSelect.value;

      // Vider le sélecteur
      livreurSelect.innerHTML = '';

      // Ajouter les options des livreurs
      appData.livreurs.forEach(livreur => {
          const option = document.createElement('option');
          option.value = livreur.id;
          option.textContent = livreur.name;
          livreurSelect.appendChild(option);
      });

      // Restaurer la sélection précédente si encore valide
      if (currentValue && [...livreurSelect.options].some(opt => opt.value === currentValue)) {
          livreurSelect.value = currentValue;
      } else if (appData.livreurs.length > 0) {
          livreurSelect.value = appData.livreurs[0].id.toString();
      }
  }


  // Fonction pour mettre à jour les couleurs des jours en fonction de la date actuelle
  function updateDayColors() {
      // Obtenir la date actuelle
      const currentDate = new Date();
      const currentDayOfWeek = currentDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
      
      // Déterminer le lundi de la semaine affichée
      const firstDayOfYear = new Date(currentYear, 0, 1);
      const dayOfWeek = firstDayOfYear.getDay();
      const offset = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1);
      const firstMonday = new Date(currentYear, 0, 1 + offset);
      const mondayOfWeek = new Date(firstMonday);
      mondayOfWeek.setDate(firstMonday.getDate() + (currentWeek - 1) * 7);
      
      // Vérifier si nous sommes dans la semaine affichée
      const currentWeekNumber = getWeekNumber(currentDate);
      const isCurrentWeek = currentWeekNumber === currentWeek && currentDate.getFullYear() === currentYear;
      
      // Sélectionner toutes les cellules du tableau (sauf la première colonne qui contient les noms)
      const cells = document.querySelectorAll('#calendar tbody td:not(.artisan-col)');
      
      // Pour chaque jour de la semaine (lundi à vendredi)
      let dayIndex = 0;
      for (let day = 1; day <= 5; day++) {
          // Calculer la date pour ce jour
          const cellDate = new Date(mondayOfWeek);
          cellDate.setDate(mondayOfWeek.getDate() + (day - 1));
          
          // Comparer avec la date actuelle
          const isSameDay = cellDate.getDate() === currentDate.getDate() && 
                          cellDate.getMonth() === currentDate.getMonth() && 
                          cellDate.getFullYear() === currentDate.getFullYear();
          
          const isPastDay = cellDate < currentDate && !isSameDay;
          const isFutureDay = cellDate > currentDate;
          
          // Appliquer la classe appropriée à toutes les cellules de ce jour
          const dayCells = Array.from(cells).filter((cell, index) => index % 5 === (day - 1));
          dayCells.forEach(cell => {
              // Supprimer les classes existantes
              cell.classList.remove('day-past', 'day-current', 'day-future');
              
              // Ajouter la classe appropriée
              if (isSameDay) {
                  cell.classList.add('day-current');
              } else if (isPastDay) {
                  cell.classList.add('day-past');
              } else if (isFutureDay) {
                  cell.classList.add('day-future');
              }
          });
      }
  }

  // Fonction pour obtenir le numéro de semaine d'une date
  function getWeekNumber(date) {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const dayOfWeek = firstDayOfYear.getDay();
      const offset = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1);
      const firstMonday = new Date(date.getFullYear(), 0, 1 + offset);
      
      // Calculer la différence en jours entre la date et le premier lundi de l'année
      const diffInTime = date.getTime() - firstMonday.getTime();
      const diffInDays = Math.floor(diffInTime / (1000 * 60 * 60 * 24));
      
      // Calculer le numéro de semaine
      return Math.floor(diffInDays / 7) + 1;
  }

  // Fonction pour vérifier si un jour d'une semaine donnée est dans le passé
  function isDayInPast(day, week, year) {
      const today = new Date();
      
      // Si l'année est antérieure à l'année courante, le jour est dans le passé
      if (year < today.getFullYear()) {
          return true;
      }
      
      // Si l'année est postérieure à l'année courante, le jour n'est pas dans le passé
      if (year > today.getFullYear()) {
          return false;
      }
      
      // Calculer la date du jour spécifié
      const firstDayOfYear = new Date(year, 0, 1);
      const dayOfWeek = firstDayOfYear.getDay();
      const offset = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1);
      const firstMonday = new Date(year, 0, 1 + offset);
      
      // Date du lundi de la semaine spécifiée
      const mondayOfWeek = new Date(firstMonday);
      mondayOfWeek.setDate(firstMonday.getDate() + (week - 1) * 7);
      
      // Date du jour spécifié
      const targetDate = new Date(mondayOfWeek);
      targetDate.setDate(mondayOfWeek.getDate() + (day - 1));
      
      // Remettre à zéro les heures pour comparer seulement les dates
      targetDate.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      
      // Vérifier si la date est antérieure à aujourd'hui
      return targetDate < todayDate;
  }
  
  // Mettre à jour l'affichage du calendrier
  function updateCalendar() {
      
      const calendarBody = document.getElementById('calendar-body');
      calendarBody.innerHTML = '';
      
      const headerLabel = currentMode === 'livraisons' ? 'Livreur' : 'Poseurs';
      document.getElementById('main-column-header').textContent = headerLabel.toUpperCase();
      
      const livreurSelector = document.getElementById('livreur-selector');
      livreurSelector.style.display = currentMode === 'livraisons' ? 'flex' : 'none';
      
      if (currentMode === 'livraisons') {
          updateLivreurSelector();
      }
      
      // Filtrer les tâches pour la semaine et le type actuel
      const weekTasks = appData.tasks.filter(task => 
          task.week === currentWeek && 
          task.year === currentYear && 
          ((currentMode === 'livraisons' && task.type === 'livraison') || 
          (currentMode === 'poseurs' && (task.type === 'pose' || task.type === 'autre')))
      );
      
      const livreurSelect = document.getElementById('selected-livreur');
      const selectedLivreurId = livreurSelect?.value;
      
      // Si nous sommes en mode livraisons et qu'un livreur est sélectionné
      if (currentMode === 'livraisons' && selectedLivreurId && selectedLivreurId !== '') {
          const livreurId = parseInt(selectedLivreurId);
          const livreurTasks = weekTasks.filter(task => task.artisanId === livreurId);
          const livreur = appData.livreurs.find(l => l.id === livreurId);
          
          if (livreur) {
              const row = document.createElement('tr');
              
              // Cellule de l'artisan
              const personCell = document.createElement('td');
              personCell.className = 'artisan-col';
              personCell.innerHTML = `${livreur.name}<span class="phone-number">${livreur.phone}</span>`;
              row.appendChild(personCell);
              
              // Pour chaque jour de la semaine
              for (let day = 1; day <= 5; day++) {
                  const cell = document.createElement('td');
                  cell.dataset.day = day;
                  cell.dataset.artisanId = livreur.id;
                  
                  cell.addEventListener('dragover', e => {
                      e.preventDefault();
                      
                      // Vérifier si on peut déposer sur ce jour
                      if (isPastDate(currentYear, currentWeek, day)) {
                          e.dataTransfer.dropEffect = 'none';
                          cell.style.backgroundColor = '#ffebee'; // Rouge clair pour indiquer l'interdiction
                      } else {
                          e.dataTransfer.dropEffect = 'move';
                          cell.style.backgroundColor = '#e8f5e8'; // Vert clair pour indiquer la possibilité
                      }
                  });

                  cell.addEventListener('dragleave', e => {
                      cell.style.backgroundColor = ''; // Retirer la couleur
                  });

                  cell.addEventListener('drop', e => {
                      e.preventDefault();
                      e.stopPropagation();
                      cell.style.backgroundColor = ''; // Retirer la couleur
                      
                      const taskId = e.dataTransfer.getData('text/plain');
                      handleTaskDrop(taskId, parseInt(day), person.id);
                  });
                  
                  // Afficher les tâches pour ce jour
                  const dayTasks = livreurTasks.filter(task => task.day === day);
                  
                  dayTasks.forEach(task => {
                      const taskElement = createTaskElement(task);
                      cell.appendChild(taskElement);
                  });
                  
                  row.appendChild(cell);
              }
              
              calendarBody.appendChild(row);
          }
      } else {
          // Mode normal avec tous les artisans
          const personList = currentMode === 'livraisons' ? appData.livreurs : appData.poseurs;
          
          personList.forEach(person => {
              const row = document.createElement('tr');
              
              // Cellule de l'artisan
              const personCell = document.createElement('td');
              personCell.className = 'artisan-col';
              personCell.innerHTML = `${person.name}<span class="phone-number">${person.phone}</span>`;
              row.appendChild(personCell);
              
              // Pour chaque jour de la semaine
              for (let day = 1; day <= 5; day++) {
                  const cell = document.createElement('td');
                  cell.dataset.day = day;
                  cell.dataset.artisanId = person.id;
                  
                  // Amélioration des événements de drag & drop
                  cell.addEventListener('dragover', e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                  });
                  
                  cell.addEventListener('drop', e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const taskId = e.dataTransfer.getData('text/plain');
                      handleTaskDrop(taskId, parseInt(day), person.id);
                  });
                  
                  // Afficher les tâches pour ce jour et cet artisan
                  const personDayTasks = weekTasks.filter(task => 
                      task.artisanId === person.id && task.day === day
                  );
                  
                  personDayTasks.forEach(task => {
                      const taskElement = createTaskElement(task);
                      cell.appendChild(taskElement); 
                  });
                  
                  row.appendChild(cell);
              }
              
              calendarBody.appendChild(row);
          });
      }
      
      updateDates();
      updateDayColors();
      updateTaskDayOptions();
  }

  //fonction pour créer un élément de tâche  -- MODIFIEE --
  function createTaskElement(task) {
      const taskElement = document.createElement('div');
      taskElement.className = `task task-${task.type}`;
      taskElement.draggable = true;
      taskElement.dataset.taskId = task.id;

      // Appliquer le style si la tâche est complétée
      if (task.completed) {
          taskElement.style.textDecoration = 'line-through';
          taskElement.style.opacity = '0.7';
      }

      // Trouver le chantier associé
      const chantier = appData.chantiers.find(c => c.id === task.chantierId);
      const chantierText = chantier ? `
          <div><strong>${chantier.name}</strong><br>${chantier.address}</div>
      ` : '';

      // Contenu HTML (apparence restaurée)
      taskElement.innerHTML = `
          <div>${task.description}</div>
          ${chantierText}
          <div>${task.notes || ''}</div>
      `;

      // Événement de sélection au clic (bordure bleue)
      taskElement.addEventListener('click', e => {
          e.stopPropagation();
          if (selectedTaskElement) {
              selectedTaskElement.style.border = 'none';
          }
          selectedTaskElement = taskElement;
          selectedTaskElement.style.border = '2px solid #3498db';
      });

      // Événement de drag
      taskElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', task.id.toString());
          e.dataTransfer.effectAllowed = 'move';
      });

      // Menu contextuel (clic droit)
      taskElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();

          removeContextMenu(); // Supprimer le menu existant
          const contextMenu = createContextMenu(task); // Créer le nouveau menu

          contextMenu.style.left = e.pageX + 'px';
          contextMenu.style.top = e.pageY + 'px';

          document.body.appendChild(contextMenu);

          // Fermer le menu en cliquant ailleurs
          setTimeout(() => {
              document.addEventListener('click', removeContextMenu, { once: true });
          }, 100);
      });

      return taskElement;
  }


  function handleTaskDrop(taskId, newDay, newArtisanId) {
      const task = appData.tasks.find(t => t.id === parseInt(taskId));
      if (!task) return;
      
      // Vérifier si on essaie de déplacer vers un jour passé
      if (isPastDate(currentYear, currentWeek, newDay)) {
          showNotification('Impossible de déplacer une tâche vers un jour passé', 'error');
          return;
      }
      
      let changed = false;
      
      // Vérifier si le jour a changé
      if (task.day !== newDay) {
          task.day = newDay;
          changed = true;
      }
      
      // Vérifier si l'artisan a changé
      if (newArtisanId && task.artisanId !== newArtisanId) {
          task.artisanId = newArtisanId;
          changed = true;
      }
      
      if (changed) {
          updateCalendar();
          showNotification('Tâche déplacée avec succès', 'success'); 
      }
  }

  // Mise à jour des dates en fonction de la semaine et de l'année
  function updateDates() {
      // Déterminer la date du premier jour de la semaine
      const firstDayOfYear = new Date(currentYear, 0, 1);
      // Calculer le jour de la semaine du 1er janvier (0 = dimanche, 1 = lundi, etc.)
      const dayOfWeek = firstDayOfYear.getDay();
      // Calculer le décalage pour obtenir le premier lundi de l'année
      const offset = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1);
      // Premier lundi de l'année
      const firstMonday = new Date(currentYear, 0, 1 + offset);
      
      // Ajouter (semaine - 1) * 7 jours pour obtenir le lundi de la semaine courante
      const mondayOfWeek = new Date(firstMonday);
      mondayOfWeek.setDate(firstMonday.getDate() + (currentWeek - 1) * 7);
      
      // Mettre à jour les dates affichées
      const dateDisplays = document.querySelectorAll('.date-display');
      for (let i = 0; i < 5; i++) {
          const date = new Date(mondayOfWeek);
          date.setDate(mondayOfWeek.getDate() + i);
          dateDisplays[i].textContent = date.getDate();
      }
  }
  
  // Initialiser le formulaire de tâche
  function initTaskForm() {
      const taskType = document.getElementById('task-type').value;
      const artisanSelect = document.getElementById('task-artisan');
      artisanSelect.innerHTML = '<option value="">Sélectionner un artisan</option>';
      
      // Déterminer quelle liste utiliser en fonction du type de tâche
      const personList = (taskType === 'livraison') ? appData.livreurs : appData.poseurs;
      
      personList.forEach(person => {
          const option = document.createElement('option');
          option.value = person.id;
          option.textContent = person.name;
          artisanSelect.appendChild(option);
      });

      const chantierSelect = document.getElementById('task-chantier');
      chantierSelect.innerHTML = '<option value=\"\">Sélectionner un chantier</option>';
      appData.chantiers.forEach(chantier => {
      const option = document.createElement('option');
      option.value = chantier.id;
      option.textContent = `${chantier.name} (${chantier.address})`;
      chantierSelect.appendChild(option);
      });
  }

  // Lire le rôle
  function parseJwt(token) {
      try {
          if (!token) return null;
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          return JSON.parse(jsonPayload);
      } catch (e) {
          console.error("Erreur décodage token:", e);
          return null;
      }
  }

  function updateRoleOptions() {
      const roleSelect = document.getElementById('new-user-role');
      const currentUser = parseJwt(localStorage.getItem('authToken'));

      const allRoles = [
          { value: 'admin', label: 'Admin' },
          { value: 'secretaire', label: 'Secrétaire' },
          { value: 'conducteur', label: 'Conducteur' },
          { value: 'etude', label: 'Étude' },
          { value: 'livreur', label: 'Livreur' },
          { value: 'poseur', label: 'Poseur' },
          { value: 'fabriquant', label: 'Fabriquant' },
          { value: 'magasinier', label: 'Magasinier' },
          { value: 'visiteur', label: 'Visiteur' }
      ];

      const visibleRoles = currentUser.role === 'developpeur'
          ? allRoles
          : allRoles.filter(r => r.value !== 'admin'); // un admin ne peut pas créer d’autre admin

      roleSelect.innerHTML = '';

      visibleRoles.forEach(role => {
          const opt = document.createElement('option');
          opt.value = role.value;
          opt.textContent = role.label;
          roleSelect.appendChild(opt);
      });
  }
  
  // Initialiser le formulaire de paramètres
      function initSettingsForm() {
      //Chargement des utilisateurs
      updateRoleOptions();
      loadUsers();

      // Gestion des poseurs
      const poseurList = document.getElementById('poseur-list');
      poseurList.innerHTML = '';
      
      if (Array.isArray(appData.poseurs)) {
          appData.poseurs.forEach(poseur => {
              const option = document.createElement('option');
              option.value = poseur.id;
              option.textContent = `${poseur.name} - ${poseur.phone}`;
              poseurList.appendChild(option);
          });
      }
      
      // Gestion des livreurs
      const livreurList = document.getElementById('livreur-list');
      livreurList.innerHTML = '';
      
      if (Array.isArray(appData.livreurs)) {
          appData.livreurs.forEach(livreur => {
              const option = document.createElement('option');
              option.value = livreur.id;
              option.textContent = `${livreur.name} - ${livreur.phone}`;
              livreurList.appendChild(option);
          });
      }

      // Gestion des chantiers
      const chantierList = document.getElementById('chantier-list');
      chantierList.innerHTML = '';

      if (Array.isArray(appData.livreurs)) {
          appData.chantiers.forEach(chantier => {
              const option = document.createElement('option');
              option.value = chantier.id;
              option.textContent = `${chantier.name} - ${chantier.address}`;
              chantierList.appendChild(option);
          });
      }
  }
  
  // Afficher une notification
  function showNotification(message, type) {
      const notification = document.getElementById('notification');
      notification.textContent = message;
      notification.className = type === 'success' ? 'notification-success' : 'notification-error';
      notification.style.display = 'block';
      
      setTimeout(() => {
          notification.style.display = 'none';
      }, 3000);
  }
  
  // Exporter les données au format JSON
  function exportData() {
      const dataStr = JSON.stringify(appData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `planning-export-${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  }
  
  // Exporter le planning au format PDF
  function exportPlanning() {
      // Création d'un élément temporaire pour l'export
      const exportElement = document.createElement('div');
      exportElement.style.width = '210mm'; // Format A4
      exportElement.style.padding = '10mm';

      // Ajouter un en-tête
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '20px';
      header.innerHTML = `<h1>Planning - Semaine ${currentWeek} (${currentYear})</h1>`;
      exportElement.appendChild(header);
      
      // Créer une copie du tableau
      const calendarClone = document.getElementById('calendar').cloneNode(true);
      
      // Améliorer le style pour l'impression
      calendarClone.style.width = '100%';
      calendarClone.style.borderCollapse = 'collapse';
      calendarClone.style.fontSize = '10pt';
      
      // Ajuster les styles pour l'impression
      const allCells = calendarClone.querySelectorAll('th, td');
      allCells.forEach(cell => {
          cell.style.border = '1px solid #000';
          cell.style.padding = '5px';
          cell.style.textAlign = 'center';
      });
      
      // Ajouter le tableau à l'élément d'export
      exportElement.appendChild(calendarClone);
      
      // Ajouter un pied de page
      const footer = document.createElement('div');
      footer.style.marginTop = '20px';
      footer.style.fontSize = '8pt';
      footer.style.textAlign = 'center';
      footer.innerHTML = `Document généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}`;
      exportElement.appendChild(footer);
      
      // Configuration pour html2pdf
      const opt = {
          margin: [10, 10],
          filename: `planning-semaine-${currentWeek}-${currentYear}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      // Générer le PDF
      html2pdf().set(opt).from(exportElement).save()
          .then(() => {
              showNotification('PDF généré avec succès', 'success');
          })
          .catch(err => {
              console.error('Erreur lors de la génération du PDF:', err);
              showNotification('Erreur lors de la génération du PDF', 'error');
          });
  }

  // Affichage utilisateur courant
  function displayUserInfo() {
      const token = localStorage.getItem('authToken');
      const userInfoDiv = document.getElementById('user-info');

      if (!token || !userInfoDiv) return;

      try {
          const user = parseJwt(token);
          if (user && user.firstname && user.lastname && user.role) {
              userInfoDiv.innerHTML = `
                  <div class="user-name">${user.firstname} ${user.lastname}</div>
                  <div class="user-role">${capitalize(user.role)}</div>
              `;
          } else {
              userInfoDiv.innerHTML = '';
          }
      } catch (e) {
          console.error("Erreur lors du décodage du token :", e);
          userInfoDiv.innerHTML = '';
      }
  }


  // Première lettre en majuscule
  function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Fonction pour créer le menu contextuel
  function createContextMenu(task) {
      const contextMenu = document.createElement('div');
      contextMenu.className = 'context-menu';
      contextMenu.style.cssText = `
          position: fixed;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
          min-width: 200px;
          padding: 5px 0;
      `;
      
      // Options pour la semaine suivante (compatible avec votre système qui va jusqu'à 53)
      const nextWeek = currentWeek + 1;
      const nextYear = nextWeek > 53 ? currentYear + 1 : currentYear;
      const actualNextWeek = nextWeek > 53 ? 1 : nextWeek;
      
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
      const nextWeekDates = getWeekDates(nextYear, actualNextWeek);
      
      days.forEach((dayName, index) => {
          const option = document.createElement('div');
          option.className = 'context-menu-item';
          option.style.cssText = `
              padding: 8px 15px;
              cursor: pointer;
              transition: background-color 0.2s;
          `;
          
          const dayNumber = nextWeekDates[index].getDate();
          const monthNumber = nextWeekDates[index].getMonth() + 1;
          option.textContent = `Déplacer vers ${dayName} ${dayNumber}/${monthNumber}`;
          
          option.addEventListener('mouseenter', () => {
              option.style.backgroundColor = '#f0f0f0';
          });
          
          option.addEventListener('mouseleave', () => {
              option.style.backgroundColor = 'transparent';
          });
          
          option.addEventListener('click', () => {
              moveTaskToNextWeek(task, index + 1, actualNextWeek, nextYear);
              removeContextMenu();
          });
          
          contextMenu.appendChild(option);
      });
      
      // Séparateur
      const separator = document.createElement('div');
      separator.style.cssText = `
          height: 1px;
          background-color: #eee;
          margin: 5px 0;
      `;
      contextMenu.appendChild(separator);
      
      // Option pour une autre semaine
      const otherWeekOption = document.createElement('div');
      otherWeekOption.className = 'context-menu-item';
      otherWeekOption.style.cssText = `
          padding: 8px 15px;
          cursor: pointer;
          transition: background-color 0.2s;
      `;
      otherWeekOption.textContent = 'Déplacer vers une autre semaine...';
      
      otherWeekOption.addEventListener('mouseenter', () => {
          otherWeekOption.style.backgroundColor = '#f0f0f0';
      });
      
      otherWeekOption.addEventListener('mouseleave', () => {
          otherWeekOption.style.backgroundColor = 'transparent';
      });
      
      otherWeekOption.addEventListener('click', () => {
          showWeekSelector(task);
          removeContextMenu();
      });
      
      contextMenu.appendChild(otherWeekOption);
      
      return contextMenu;
  }

  // Fonction pour déplacer une tâche vers la semaine suivante
  function moveTaskToNextWeek(task, newDay, newWeek, newYear) {
      task.day = newDay;
      task.week = newWeek;
      task.year = newYear;
      
      updateCalendar();
      showNotification(`Tâche déplacée vers la semaine ${newWeek}`, 'success');
  }

  // Fonction pour afficher le sélecteur de semaine
  function showWeekSelector(task) {
      const modal = document.createElement('div');
      modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
      `;
      
      const dialog = document.createElement('div');
      dialog.style.cssText = `
          background: white;
          padding: 20px;
          border-radius: 8px;
          min-width: 300px;
          max-width: 400px;
      `;
      
      dialog.innerHTML = `
          <h3>Sélectionner une semaine</h3>
          <div style="margin: 15px 0;">
              <label for="week-input">Numéro de semaine :</label>
              <input type="number" id="week-input-modal" min="1" max="53" style="margin-left: 10px; padding: 5px;">
          </div>
          <div style="margin: 15px 0;">
              <label for="year-input">Année :</label>
              <input type="number" id="year-input" value="${currentYear}" min="${currentYear}" style="margin-left: 10px; padding: 5px;">
          </div>
          <div style="margin: 15px 0;">
              <label for="day-select">Jour :</label>
              <select id="day-select" style="margin-left: 10px; padding: 5px;">
                  <option value="1">Lundi</option>
                  <option value="2">Mardi</option>
                  <option value="3">Mercredi</option>
                  <option value="4">Jeudi</option>
                  <option value="5">Vendredi</option>
              </select>
          </div>
          <div style="margin-top: 20px;">
              <button id="confirm-move" style="padding: 8px 15px; margin-right: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirmer</button>
              <button id="cancel-move" style="padding: 8px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Annuler</button>
          </div>
      `;
      
      modal.appendChild(dialog);
      document.body.appendChild(modal);
      
      // Gestionnaires d'événements
      document.getElementById('confirm-move').addEventListener('click', () => {
          const weekInput = document.getElementById('week-input-modal');
          const yearInput = document.getElementById('year-input');
          const daySelect = document.getElementById('day-select');
          
          const selectedWeek = parseInt(weekInput.value);
          const selectedYear = parseInt(yearInput.value);
          const selectedDay = parseInt(daySelect.value);
          
          if (!selectedWeek || selectedWeek < 1 || selectedWeek > 53) {
              showNotification('Veuillez sélectionner un numéro de semaine valide (1-53)', 'error');
              return;
          }
          
          // Vérifier que ce n'est pas la semaine actuelle ou une semaine passée
          if (selectedYear === currentYear && selectedWeek <= currentWeek) {
              showNotification('Impossible de déplacer vers la semaine actuelle ou une semaine passée', 'error');
              return;
          }
          
          if (selectedYear < currentYear) {
              showNotification('Impossible de déplacer vers une année passée', 'error');
              return;
          }
          
          // Déplacer la tâche
          task.week = selectedWeek;
          task.year = selectedYear;
          task.day = selectedDay;
          
          updateCalendar();
          showNotification(`Tâche déplacée vers la semaine ${selectedWeek} de ${selectedYear}`, 'success');
          
          document.body.removeChild(modal);
      });
      
      document.getElementById('cancel-move').addEventListener('click', () => {
          document.body.removeChild(modal);
      });
      
      // Fermer avec Escape
      modal.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
              document.body.removeChild(modal);
          }
      });
      
      // Focus sur le premier input
      setTimeout(() => {
          document.getElementById('week-input-modal').focus();
      }, 100);
  }

  // Fonction pour supprimer le menu contextuel
  function removeContextMenu() {
      const existingMenu = document.querySelector('.context-menu');
      if (existingMenu) {
          existingMenu.remove();
      }
  }
  
  // Gestionnaires d'événements
  document.addEventListener('DOMContentLoaded', () => {

      // Mettre à jour currentWeek avec la semaine actuelle
      currentWeek = getCurrentWeek();
      document.getElementById('week-input').value = currentWeek;

      // Charger les données
      loadData();
      displayUserInfo();
      updateRoleOptions();

          // Vérifier et mettre à jour les couleurs toutes les minutes
      setInterval(() => {
          updateDayColors();
          
          // Vérifier si nous avons changé de jour
          const now = new Date();
          if (now.getHours() === 0 && now.getMinutes() === 0) {
              // À minuit, mise à jour complète du calendrier
              updateCalendar();
          }
      }, 60000); // 60000 ms = 1 minute
      
      // Initialiser le calendrier
      updateCalendar();
      updateTaskDayOptions();

      // Bouton de déconnexion
      document.getElementById('logout-btn').addEventListener('click', () => {
          localStorage.removeItem('authToken'); // 🔐 supprime le token
          window.location.href = 'login.html'; // ⏎ retour à la connexion
          });

      
      // Gestion des onglets
      document.getElementById('tab-livraisons').addEventListener('click', () => {
          document.getElementById('tab-livraisons').classList.add('active');
          document.getElementById('tab-poseurs').classList.remove('active');
          currentMode = 'livraisons';
          updateCalendar();
      });
      
      document.getElementById('tab-poseurs').addEventListener('click', () => {
          document.getElementById('tab-poseurs').classList.add('active');
          document.getElementById('tab-livraisons').classList.remove('active');
          currentMode = 'poseurs';
          updateCalendar();
      });
      
      // Navigation des semaines
      document.getElementById('prev-week').addEventListener('click', () => {
          if (currentWeek > 1) {
              currentWeek--;
              document.getElementById('week-input').value = currentWeek;
              updateCalendar();
          }
      });
      
      document.getElementById('next-week').addEventListener('click', () => {
          if (currentWeek < 53) {
              currentWeek++;
              document.getElementById('week-input').value = currentWeek;
              updateCalendar();
          }
      });
      
      document.getElementById('week-input').addEventListener('change', (e) => {
          const newWeek = parseInt(e.target.value);
          if (newWeek >= 1 && newWeek <= 53) {
              currentWeek = newWeek;
              updateCalendar();
          }
      });
      
      // Gestion des modals
      const modals = document.querySelectorAll('.modal');
      const closeButtons = document.querySelectorAll('.close, .close-modal');
      
      closeButtons.forEach(button => {
          button.addEventListener('click', () => {
              modals.forEach(modal => {
                  modal.style.display = 'none';
              });
          });
      });
      
      // Ouvrir le modal de tâche
      document.getElementById('add-task').addEventListener('click', () => {
          initTaskForm();
          updateTaskDayOptions();
          document.getElementById('task-modal').style.display = 'flex';
      });

      
      // Enregistrer une tâche
      document.getElementById('save-task').addEventListener('click', () => {
          const type = document.getElementById('task-type').value;
          const artisanId = parseInt(document.getElementById('task-artisan').value);
          const day = parseInt(document.getElementById('task-day').value);
          const description = document.getElementById('task-description').value;
          const notes = document.getElementById('task-notes').value;
          const chantierId = parseInt(document.getElementById('task-chantier').value);

          if (!type || !artisanId || !day || !description) {
              showNotification('Veuillez remplir tous les champs obligatoires', 'error');
              return;
          }

          if (isDayInPast(day, currentWeek, currentYear)) {
              showNotification('Impossible de créer une tâche pour une date passée', 'error');
              return;
          }

          if (!chantierId) {
              showNotification('Veuillez sélectionner un chantier', 'error');
              return;
          }

          const newTask = {
              type,
              artisanId,
              day,
              week: currentWeek,
              year: currentYear,
              description,
              chantierId,
              notes,
              completed: false
          };

          addTask(newTask)
              .then(task => {
              appData.tasks.push(task); // contient l'id auto-généré
              updateCalendar();
              document.getElementById('task-modal').style.display = 'none';
              document.getElementById('task-form').reset();
              showNotification('Tâche ajoutée avec succès', 'success');
              })
              .catch(() => {
              showNotification("Erreur lors de l'ajout de la tâche", 'error');
              });
      });

      
      // Marquer une tâche comme terminée
      document.getElementById('mark-completed').addEventListener('click', () => {
          if (selectedTaskElement) {
              const taskId = parseInt(selectedTaskElement.dataset.taskId);
              const taskIndex = appData.tasks.findIndex(task => task.id === taskId);

              if (taskIndex !== -1) {
              appData.tasks[taskIndex].completed = !appData.tasks[taskIndex].completed;
              updateTask(appData.tasks[taskIndex])
                  .then(() => {
                  updateCalendar();
                  selectedTaskElement = null;
                  showNotification('Statut de la tâche mis à jour', 'success');
                  })
                  .catch(() => showNotification("Erreur lors de la mise à jour de la tâche", 'error'));
              }
          } else {
              showNotification('Veuillez sélectionner une tâche', 'error');
          }
      });
      
      // Supprimer une tâche
      document.getElementById('delete-task').addEventListener('click', () => {
          if (selectedTaskElement) {
              const taskId = parseInt(selectedTaskElement.dataset.taskId);
              const taskIndex = appData.tasks.findIndex(task => task.id === taskId);

              if (taskIndex !== -1) {
              deleteTask(taskId)
                  .then(() => {
                  appData.tasks.splice(taskIndex, 1);
                  updateCalendar();
                  selectedTaskElement = null;
                  showNotification('Tâche supprimée avec succès', 'success');
                  })
                  .catch(() => showNotification("Erreur lors de la suppression de la tâche", 'error'));
              }
          } else {
              showNotification('Veuillez sélectionner une tâche', 'error');
          }
      });
      
      // Exporter le planning
      document.getElementById('export-planning').addEventListener('click', exportPlanning);
      
      // Ouvrir le modal de paramètres
      document.getElementById('settings').addEventListener('click', () => {
          initSettingsForm();
          document.getElementById('settings-modal').style.display = 'flex';
      });

      // Gestion de la modification du type de tâche qui change la liste des artisans disponibles
      document.getElementById('task-type').addEventListener('change', () => {
          initTaskForm();
      });

      // Gestion du changement de livreur sélectionné
      document.getElementById('selected-livreur').addEventListener('change', () => {
          updateCalendar();
      });

      // Gestion des onglets dans les paramètres
      document.querySelectorAll('.settings-tab').forEach(tab => {
          tab.addEventListener('click', (e) => {
              // Désactiver tous les onglets et panneaux
              document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
              document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
              
              // Activer l'onglet cliqué et le panneau correspondant
              e.target.classList.add('active');
              const panelId = `${e.target.dataset.tab}-settings`;
              document.getElementById(panelId).classList.add('active');
          });
      });

      // Gestion des livreurs
      document.getElementById('add-livreur').addEventListener('click', () => {
          const name = document.getElementById('new-livreur-name').value;
          const phone = document.getElementById('new-livreur-phone').value;

          if (!name) {
              showNotification('Veuillez saisir un nom de livreur', 'error');
              return;
          }

          const newLivreur = {
              name,
              phone: phone || ''
          };

          addLivreur(newLivreur)
          .then(livreur => {
              appData.livreurs.push(livreur);
              initSettingsForm();
              document.getElementById('new-livreur-name').value = '';
              document.getElementById('new-livreur-phone').value = '';
              updateCalendar();
              showNotification('Livreur ajouté avec succès', 'success');
          })
          .catch(() => showNotification("Erreur lors de l'ajout du livreur", 'error'));
      });

      document.getElementById('remove-livreur').addEventListener('click', () => {
          const livreurList = document.getElementById('livreur-list');
          const selectedLivreurId = parseInt(livreurList.value);

          if (!selectedLivreurId) {
              showNotification('Veuillez sélectionner un livreur', 'error');
              return;
          }

          const livreurTasks = appData.tasks.filter(task => task.artisanId === selectedLivreurId);

          if (livreurTasks.length > 0) {
              if (!confirm(`Ce livreur a ${livreurTasks.length} tâche(s) associée(s). Voulez-vous vraiment le supprimer ? Toutes les tâches associées seront également supprimées.`)) {
              return;
              }

              const deletePromises = livreurTasks.map(task => deleteTask(task.id));
              Promise.all(deletePromises).then(() => {
              appData.tasks = appData.tasks.filter(task => task.artisanId !== selectedLivreurId);
              deleteLivreur(selectedLivreurId)
                  .then(() => {
                  appData.livreurs = appData.livreurs.filter(l => l.id !== selectedLivreurId);
                  initSettingsForm();
                  updateCalendar();
                  showNotification('Livreur supprimé avec succès', 'success');
                  })
                  .catch(() => showNotification("Erreur lors de la suppression du livreur", 'error'));
              });
          } else {
              deleteLivreur(selectedLivreurId)
              .then(() => {
                  appData.livreurs = appData.livreurs.filter(l => l.id !== selectedLivreurId);
                  initSettingsForm();
                  updateCalendar();
                  showNotification('Livreur supprimé avec succès', 'success');
              })
              .catch(() => showNotification("Erreur lors de la suppression du livreur", 'error'));
          }
      });


      // Gestion des poseurs 
      // Ajout d’un poseur
      document.getElementById('add-poseur').addEventListener('click', () => {
          const name = document.getElementById('new-poseur-name').value;
          const phone = document.getElementById('new-poseur-phone').value;

          if (!name) {
              showNotification('Veuillez saisir un nom de poseur', 'error');
              return;
          }

          const newPoseur = {
              name,
              phone: phone || ''
          };

          addPoseur(newPoseur)
              .then(poseur => {
              appData.poseurs.push(poseur);
              initSettingsForm();
              document.getElementById('new-poseur-name').value = '';
              document.getElementById('new-poseur-phone').value = '';
              updateCalendar();
              showNotification('Poseur ajouté avec succès', 'success');
              })
              .catch(() => showNotification("Erreur lors de l'ajout du poseur", 'error'));
          });

          // Suppression d’un poseur
          document.getElementById('remove-poseur').addEventListener('click', () => {
          const poseurList = document.getElementById('poseur-list');
          const selectedPoseurId = parseInt(poseurList.value);

          if (!selectedPoseurId) {
              showNotification('Veuillez sélectionner un poseur', 'error');
              return;
          }

          const poseurTasks = appData.tasks.filter(task => task.artisanId === selectedPoseurId);

          if (poseurTasks.length > 0) {
              if (!confirm(`Ce poseur a ${poseurTasks.length} tâche(s) associée(s). Voulez-vous vraiment le supprimer ? Toutes les tâches associées seront également supprimées.`)) {
              return;
              }

              const deletePromises = poseurTasks.map(task => deleteTask(task.id));
              Promise.all(deletePromises).then(() => {
              appData.tasks = appData.tasks.filter(task => task.artisanId !== selectedPoseurId);
              deletePoseur(selectedPoseurId)
                  .then(() => {
                  appData.poseurs = appData.poseurs.filter(p => p.id !== selectedPoseurId);
                  initSettingsForm();
                  updateCalendar();
                  showNotification('Poseur supprimé avec succès', 'success');
                  })
                  .catch(() => showNotification("Erreur lors de la suppression du poseur", 'error'));
              });
          } else {
              deletePoseur(selectedPoseurId)
              .then(() => {
                  appData.poseurs = appData.poseurs.filter(p => p.id !== selectedPoseurId);
                  initSettingsForm();
                  updateCalendar();
                  showNotification('Poseur supprimé avec succès', 'success');
              })
              .catch(() => showNotification("Erreur lors de la suppression du poseur", 'error'));
          }
      });

      // Gestion des chantiers
      // Ajout d’un chantier
      document.getElementById('add-chantier').addEventListener('click', () => {
          const name = document.getElementById('new-chantier-name').value.trim();
          const address = document.getElementById('new-chantier-address').value.trim();

          if (!name || !address) {
              showNotification('Veuillez renseigner le nom et l\'adresse du chantier', 'error');
              return;
          }

          const chantier = {
              name,
              address
          };

          addChantier(chantier)
              .then(newChantier => {
              appData.chantiers.push(newChantier);
              initSettingsForm();
              document.getElementById('new-chantier-name').value = '';
              document.getElementById('new-chantier-address').value = '';
              showNotification('Chantier ajouté avec succès', 'success');
              })
              .catch(() => showNotification("Erreur lors de l'ajout du chantier", 'error'));
          });

          // Suppression d’un chantier
          document.getElementById('remove-chantier').addEventListener('click', () => {
          const chantierList = document.getElementById('chantier-list');
          const chantierId = parseInt(chantierList.value);

          if (!chantierId) {
              showNotification('Veuillez sélectionner un chantier à supprimer', 'error');
              return;
          }

          deleteChantier(chantierId)
              .then(() => {
              appData.chantiers = appData.chantiers.filter(c => c.id !== chantierId);
              initSettingsForm();
              showNotification('Chantier supprimé avec succès', 'success');
              })
              .catch(() => showNotification("Erreur lors de la suppression du chantier", 'error'));
      });

      function clearUserForm() {
          document.getElementById('new-user-firstname').value = '';
          document.getElementById('new-user-lastname').value = '';
          document.getElementById('new-user-login').value = '';
          document.getElementById('new-user-password').value = '';
          document.getElementById('user-list').value = '';
          // Ne pas réinitialiser le rôle pour garder la dernière sélection
      }

      // Ajout d'un utilisateur
      document.getElementById('add-user').addEventListener('click', async () => {
          const firstname = document.getElementById('new-user-firstname').value.trim();
          const lastname = document.getElementById('new-user-lastname').value.trim();
          const username = document.getElementById('new-user-login').value.trim();
          const password = document.getElementById('new-user-password').value;
          const role = document.getElementById('new-user-role').value;

          if (!firstname || !lastname || !username || !password || !role) {
              showNotification('Veuillez remplir tous les champs', 'error');
              return;
          }

          // Protection côté client : si admin, bloquer la création d'un autre admin ou d'un développeur
          const currentUser = parseJwt(localStorage.getItem('authToken'));
          if (!currentUser) {
              showNotification('Session invalide, veuillez vous reconnecter', 'error');
              return;
          }

          if (currentUser.role === 'admin' && (role === 'admin' || role === 'developpeur')) {
              showNotification('Un admin ne peut pas créer un autre admin ou un développeur', 'error');
              return;
          }

          try {
              console.log('Tentative de création d\'utilisateur:', { firstname, lastname, username, role });
              
              const response = await authFetch('/users', {
                  method: 'POST',
                  body: JSON.stringify({ firstname, lastname, username, password, role })
              });

              console.log('Réponse serveur pour création:', response);
              showNotification('Utilisateur ajouté avec succès', 'success');
              
              // Recharger la liste et vider le formulaire
              await loadUsers();
              clearUserForm();
              
          } catch (err) {
              console.error('Erreur lors de l\'ajout de l\'utilisateur:', err);
              showNotification(`Erreur lors de l'ajout: ${err.message}`, 'error');
          }
      });

      // Changement de la sélection d'utilisateur
      document.getElementById('user-list').addEventListener('change', async () => {
          const selectedId = parseInt(document.getElementById('user-list').value);
          if (!selectedId) {
              // Si aucune sélection, vider le formulaire
              clearUserForm();
              return;
          }

          try {
              console.log('Chargement des données pour l\'utilisateur ID:', selectedId);
              const user = await authFetch(`/users/${selectedId}`);
              
              if (user) {
                  console.log('Données utilisateur reçues:', user);
                  document.getElementById('new-user-firstname').value = user.firstname || '';
                  document.getElementById('new-user-lastname').value = user.lastname || '';
                  document.getElementById('new-user-login').value = user.username || '';
                  document.getElementById('new-user-role').value = user.role || '';
                  // On ne pré-remplit pas le mot de passe : il est optionnel pour la modification
                  document.getElementById('new-user-password').value = '';
              }
          } catch (err) {
              console.error('Erreur lors du chargement des données utilisateur:', err);
              showNotification(`Erreur lors du chargement: ${err.message}`, 'error');
              // En cas d'erreur, vider le formulaire
              clearUserForm();
          }
      });

      // Modifier un utilisateur
      document.getElementById('edit-user').addEventListener('click', async () => {
          const userId = parseInt(document.getElementById('user-list').value);
          if (!userId) {
              showNotification('Veuillez sélectionner un utilisateur à modifier', 'error');
              return;
          }

          const firstname = document.getElementById('new-user-firstname').value.trim();
          const lastname = document.getElementById('new-user-lastname').value.trim();
          const username = document.getElementById('new-user-login').value.trim();
          const password = document.getElementById('new-user-password').value; // facultatif
          const role = document.getElementById('new-user-role').value;

          if (!firstname || !lastname || !username || !role) {
              showNotification('Veuillez remplir tous les champs (le mot de passe est optionnel)', 'error');
              return;
          }

          // Vérification côté client des permissions
          const currentUser = parseJwt(localStorage.getItem('authToken'));
          if (!currentUser) {
              showNotification('Session invalide, veuillez vous reconnecter', 'error');
              return;
          }

          try {
              console.log('Tentative de modification de l\'utilisateur ID:', userId);
              
              const data = { firstname, lastname, username, role };
              if (password && password.length > 0) {
                  data.password = password;
              }

              console.log('Données à envoyer:', data);

              const response = await authFetch(`/users/${userId}`, {
                  method: 'PUT',
                  body: JSON.stringify(data)
              });

              console.log('Réponse serveur pour modification:', response);
              showNotification('Utilisateur modifié avec succès', 'success');
              
              // Recharger la liste et vider le formulaire
              await loadUsers();
              clearUserForm();
              
          } catch (err) {
              console.error('Erreur lors de la modification:', err);
              showNotification(`Erreur lors de la modification: ${err.message}`, 'error');
          }
      });

      //Suppresion d'un utilisateur
      document.getElementById('remove-user').addEventListener('click', async () => {
          const selectedId = parseInt(document.getElementById('user-list').value);
          if (!selectedId) {
              showNotification('Veuillez sélectionner un utilisateur à supprimer', 'error');
              return;
          }

          const currentUser = parseJwt(localStorage.getItem('authToken'));
          if (!currentUser) {
              showNotification('Session invalide, veuillez vous reconnecter', 'error');
              return;
          }

          // Récupérer les infos de l'utilisateur sélectionné depuis l'option
          const selectedOption = document.querySelector(`#user-list option[value="${selectedId}"]`);
          const selectedText = selectedOption?.textContent.toLowerCase() || '';

          // Protection visuelle côté client
          if (currentUser.role !== 'developpeur' && (selectedText.includes('admin') || selectedText.includes('developpeur'))) {
              showNotification('Seul un développeur peut supprimer un admin ou un autre développeur', 'error');
              return;
          }

          // Demander confirmation
          const confirmMessage = `Voulez-vous vraiment supprimer l'utilisateur : ${selectedOption?.textContent || 'Utilisateur sélectionné'} ?`;
          if (!confirm(confirmMessage)) return;

          try {
              console.log('Tentative de suppression de l\'utilisateur ID:', selectedId);
              
              const response = await authFetch(`/users/${selectedId}`, { 
                  method: 'DELETE' 
              });

              console.log('Réponse serveur pour suppression:', response);
              showNotification('Utilisateur supprimé avec succès', 'success');
              
              // Recharger la liste et vider le formulaire
              await loadUsers();
              clearUserForm();
              
          } catch (err) {
              console.error('Erreur lors de la suppression:', err);
              showNotification(`Erreur lors de la suppression: ${err.message}`, 'error');
          }
      });

      // Fonction utilitaire pour réinitialiser le formulaire (bouton optionnel)
      if (document.getElementById('reset-user-form')) {
          document.getElementById('reset-user-form').addEventListener('click', () => {
              clearUserForm();
              showNotification('Formulaire réinitialisé', 'info');
          });
      }
      
      // Exporter les données
      document.getElementById('export-data').addEventListener('click', exportData);
      
      // Importer des données
      document.getElementById('import-data').addEventListener('click', () => {
          document.getElementById('import-file').click();
      });

      // Gérer le changement d'intervalle de sauvegarde automatique
      document.getElementById('auto-save-interval').addEventListener('change', (e) => {
          autoSaveInterval = parseInt(e.target.value);
          localStorage.setItem('autoSaveInterval', autoSaveInterval.toString());
          setupAutoSave();
          showNotification('Paramètre de sauvegarde automatique mis à jour', 'success');
      });
      
      document.getElementById('import-file').addEventListener('change', (e) => {
          const file = e.target.files[0];
          
          if (file) {
              const reader = new FileReader();
              
              reader.onload = (event) => {
                  try {
                      const importedData = JSON.parse(event.target.result);
                      
                      // Vérifier si les données importées ont la structure attendue
                      if (importedData.artisans && importedData.tasks) {
                          if (confirm('Êtes-vous sûr de vouloir remplacer toutes les données actuelles par les données importées ?')) {
                              appData = importedData;
                              
                              // Sauvegarder les données
                              if (saveData()) {
                                  // Mettre à jour l'interface
                                  updateCalendar();
                                  initSettingsForm();
                                  
                                  showNotification('Données importées avec succès', 'success');
                              }
                          }
                      } else {
                          showNotification('Format de fichier invalide', 'error');
                      }
                  } catch (error) {
                      console.error('Erreur lors de l\'importation des données:', error);
                      showNotification('Erreur lors de l\'importation des données', 'error');
                  }
                  
                  // Réinitialiser l'élément file input
                  e.target.value = '';
              };
              
              reader.readAsText(file);
          }
      });
      
      // Fermer les modals en cliquant en dehors du contenu
      window.addEventListener('click', (e) => {
          modals.forEach(modal => {
              if (e.target === modal) {
                  modal.style.display = 'none';
              }
          });
      });
  });