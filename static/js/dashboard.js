console.log("Dashboard JS loaded!");

document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('dashboard-calendar');
  const modalEl = document.getElementById('addEventModal');
  const eventModal = new bootstrap.Modal(modalEl);
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger me-auto';
  deleteBtn.textContent = 'Delete';
  let activeEventId = null;

  const modalFooter = modalEl.querySelector('.modal-footer');
  if (!modalFooter.querySelector('.btn-danger')) {
    modalFooter.insertBefore(deleteBtn, modalFooter.firstChild);
    deleteBtn.style.display = 'none';
  }

  deleteBtn.onclick = () => {
    if (activeEventId && confirm('Are you sure you want to delete this event?')) {
      fetch(`/delete_event/${activeEventId}/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCSRFToken() }
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
      .catch(() => alert('Server error during delete.'));
    }
  };

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
      dayHeaders: false,
      allDaySlot: false,
      nowIndicator: true,
      slotDuration: '00:30:00',
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      scrollTime: (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
      })(),
      now: new Date(),
      events: window.eventsJsonUrl,

      eventContent: function(arg) {
        return {
          domNodes: [document.createTextNode(arg.event.title)]
        };
      },

      eventClick: function (info) {
        const event = info.event;
        activeEventId = event.id;

        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.extendedProps.description || '';
        document.getElementById('event-start').value = formatDateTimeLocal(event.start);
        document.getElementById('event-end').value = event.end ? formatDateTimeLocal(event.end) : '';
        document.getElementById('event-category').value = event.extendedProps.category_id || '';

        deleteBtn.style.display = 'inline-block';
        eventModal.show();
      },

      dateClick: function (info) {
        activeEventId = null;
        document.getElementById('addEventForm').reset();
        document.getElementById('event-start').value = formatDateTimeLocal(info.date);
        document.getElementById('event-end').value = formatDateTimeLocal(new Date(info.date.getTime() + 30 * 60000));
        deleteBtn.style.display = 'none';
        eventModal.show();
      },

      eventDrop: handleEventUpdate,
      eventResize: handleEventUpdate
    });

    window.dashboardCalendar = calendar;
    calendar.render();
  }

  document.getElementById('addEventForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    if (activeEventId) {
      formData.append('id', activeEventId);
    }

    fetch("{% url 'add_event' %}", {
      method: 'POST',
      headers: { 'X-CSRFToken': getCSRFToken() },
      body: formData
    })
    .then(r => r.json())
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

  function handleEventUpdate(info) {
    const eventId = info.event.id;
    const newStart = info.event.start.toISOString();
    const newEnd = info.event.end ? info.event.end.toISOString() : null;

    fetch("{% url 'update_event_time' %}", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({ id: eventId, start: newStart, end: newEnd })
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
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
  }

  function getCSRFToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      if (c.trim().startsWith(name + '=')) {
        return c.trim().substring(name.length + 1);
      }
    }
    return '';
  }
});
