console.log("Dashboard JS loaded!");

document.addEventListener('DOMContentLoaded', function () {
  // Global CSRF token function—make it accessible as window.getCSRFToken
  window.getCSRFToken = function () {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      if (c.trim().startsWith(name + '=')) {
        return c.trim().substring(name.length + 1);
      }
    }
    return '';
  };

  // === CALENDAR EVENT CODE ===
  const calendarEl = document.getElementById('dashboard-calendar');
  const modalEl = document.getElementById('addEventModal');
  const eventModal = new bootstrap.Modal(modalEl);
  const form = document.getElementById('addEventForm');
  const deleteBtn = document.getElementById('calendarDeleteEventBtn');
  const modalTitle = document.getElementById('addEventModalLabel');
  const saveBtn = document.getElementById('saveEventBtn');
  const eventIdInput = document.getElementById('event-id');
  let activeEventId = null;

  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      themeSystem: 'bootstrap',
      initialView: 'timeGridDay',
      height: 850,
      editable: true,
      eventResizableFromStart: true,
      headerToolbar: {
        left: 'prev today',
        center: 'title',
        right: 'next'
      },
      allDaySlot: false,
      nowIndicator: true,
      slotDuration: '00:30:00',
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      now: new Date(),
      scrollTime: (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
      })(),
      events: window.eventsJsonUrl,
      eventContent: function(arg) {
        return { domNodes: [document.createTextNode(arg.event.title)] };
      },
      eventClick: function (info) {
        const event = info.event;
        activeEventId = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.extendedProps.description || '';
        document.getElementById('event-start').value = formatDateTimeLocal(event.start);
        document.getElementById('event-end').value = event.end ? formatDateTimeLocal(event.end) : '';
        document.getElementById('event-category').value = event.extendedProps.category_id || '';
        document.getElementById('event-id').value = event.id;
        deleteBtn.style.display = 'inline-block';
        modalTitle.textContent = 'Update Event';
        saveBtn.textContent = 'Update Event';
        eventModal.show();
      },
      dateClick: function (info) {
        activeEventId = null;
        form.reset();
        document.getElementById('event-start').value = formatDateTimeLocal(info.date);
        document.getElementById('event-end').value = formatDateTimeLocal(new Date(info.date.getTime() + 30 * 60000));
        eventIdInput.value = '';
        deleteBtn.style.display = 'none';
        modalTitle.textContent = 'Add New Event';
        saveBtn.textContent = 'Create Event';
        eventModal.show();
      },
      eventDrop: handleEventUpdate,
      eventResize: handleEventUpdate
    });
    window.dashboardCalendar = calendar;
    calendar.render();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    if (activeEventId) formData.append('id', activeEventId);
    fetch("/add_event/", {
      method: 'POST',
      headers: { 'X-CSRFToken': window.getCSRFToken() },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        eventModal.hide();
        window.dashboardCalendar.refetchEvents();
      } else {
        alert(data.error || 'Could not create/update event.');
      }
    })
    .catch(() => alert("Server error"));
  });

  deleteBtn.addEventListener('click', function () {
    if (activeEventId && confirm("Are you sure you want to delete this event?")) {
      fetch(`/delete_event/${activeEventId}/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': window.getCSRFToken() }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          eventModal.hide();
          window.dashboardCalendar.refetchEvents();
        } else {
          alert(data.error || 'Failed to delete.');
        }
      })
      .catch(() => alert("Server error during delete."));
    }
  });

  function handleEventUpdate(info) {
    fetch("/update_event_time/", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.getCSRFToken()
      },
      body: JSON.stringify({
        id: info.event.id,
        start: info.event.start.toISOString(),
        end: info.event.end ? info.event.end.toISOString() : null
      })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("Failed to update event.");
        info.revert();
      }
    })
    .catch(() => {
      alert("Server error.");
      info.revert();
    });
  }

  function formatDateTimeLocal(date) {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString().slice(0, 16);
  }
});
