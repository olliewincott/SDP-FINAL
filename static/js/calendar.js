document.addEventListener('DOMContentLoaded', function () {
    const calendarEl   = document.getElementById('dashboard-calendar');
    const modalEl      = document.getElementById('addEventModal');
    const form         = document.getElementById('addEventForm');
    const deleteBtn    = document.getElementById('calendarDeleteEventBtn');
    const eventIdInput = document.getElementById('event-id');
    const modalTitle   = document.getElementById('addEventModalLabel');
    const saveBtn      = document.getElementById('saveEventBtn');
    let activeEventId  = null;
    if (!calendarEl) return;
  
    function getCSRFToken() {
      return document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrftoken='))
        ?.split('=')[1] || '';
    }
    function showModal() { modalEl.classList.remove('hidden'); }
    function hideModal() { modalEl.classList.add('hidden'); }
    document.querySelectorAll('[data-close-modal]').forEach(btn =>
      btn.addEventListener('click', hideModal)
    );
  
    const calendar = new FullCalendar.Calendar(calendarEl, {
      themeSystem:      'bootstrap',
      initialView:      'timeGridWeek',
      headerToolbar: {
        left:   'prev today next',
        center: 'title',
        right:  'dayGridMonth,timeGridWeek,timeGridDay'
      },
      firstDay:         1,
      height:           '100%',
      editable:         true,
      allDaySlot:       false,
      nowIndicator:     true,
      slotDuration:     '00:30:00',
      slotLabelInterval:'01:00:00',
      slotMinTime:      '00:00:00',
      slotMaxTime:      '24:00:00',
      scrollTime:       '06:00:00',
  
      events: window.eventsJsonUrl,
  
      // 1) draw your inner pill (text + padding + radius)
      eventContent(arg) {
        const bg = arg.event.backgroundColor || '#5ac8fa';
        return {
          html: `<div style="
            background-color: ${bg};
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.85rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${arg.event.title}</div>`
        };
      },
  
      // 2) once it's in the DOM, recolor the harness that spans the slot
      eventDidMount(info) {
        const bg = info.event.backgroundColor || '#5ac8fa';
  
        // find the anchor <a class="fc-event">
        const anchor = info.el.closest('a.fc-event');
        if (!anchor) return;
  
        // climb up to the harness container
        let harness = anchor.parentElement;
        while (
          harness &&
          !harness.classList.contains('fc-timegrid-event-harness') &&
          !harness.classList.contains('fc-daygrid-event-harness')
        ) {
          harness = harness.parentElement;
        }
        if (harness) {
          // paint the harness full‑span background + border
          harness.style.backgroundColor = bg;
          harness.style.border          = `1px solid ${bg}`;
          harness.style.borderRadius    = '6px';
          harness.style.boxShadow       = 'none';
        }
  
        // clear the anchor itself so it doesn't draw its own box
        anchor.style.background = 'transparent';
        anchor.style.border     = 'none';
        anchor.style.boxShadow  = 'none';
      },
  
      // Edit existing event
      eventClick(info) {
        const e = info.event;
        activeEventId = e.id;
        form.reset();
        document.getElementById('event-title').value       = e.title;
        document.getElementById('event-description').value = e.extendedProps.description || '';
        document.getElementById('event-start').value       = formatDate(e.start);
        document.getElementById('event-end').value         = e.end ? formatDate(e.end) : '';
        document.getElementById('event-category').value    = e.extendedProps.category_id || '';
        eventIdInput.value = e.id;
        deleteBtn.classList.remove('hidden');
        modalTitle.textContent = 'Update Event';
        saveBtn.textContent    = 'Update Event';
        showModal();
      },
  
      // Add new event
      dateClick(info) {
        form.reset();
        activeEventId = null;
        eventIdInput.value = '';
        document.getElementById('event-start').value = formatDate(info.date);
        document.getElementById('event-end').value   = formatDate(new Date(info.date.getTime() + 30*60000));
        deleteBtn.classList.add('hidden');
        modalTitle.textContent = 'Add New Event';
        saveBtn.textContent    = 'Create Event';
        showModal();
      },
  
      // Drag/resize handlers
      eventDrop:   patchEventTime,
      eventResize: patchEventTime,
    });
  
    calendar.render();
  
    // Form submit (create/update)
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      if (activeEventId) fd.append('id', activeEventId);
  
      fetch('/add_event/', {
        method:  'POST',
        headers: { 'X-CSRFToken': getCSRFToken() },
        body:    fd
      })
      .then(r => r.json())
      .then(js => {
        if (js.success) {
          hideModal();
          calendar.refetchEvents();
        } else {
          alert(js.error || 'Save failed');
        }
      })
      .catch(() => alert('Server error'));
    });
  
    // Delete event
    deleteBtn.addEventListener('click', () => {
      if (!activeEventId || !confirm('Delete this event?')) return;
      fetch(`/delete_event/${activeEventId}/`, {
        method:  'POST',
        headers: { 'X-CSRFToken': getCSRFToken() }
      })
      .then(r => r.json())
      .then(js => {
        if (js.success) {
          hideModal();
          calendar.refetchEvents();
        } else {
          alert(js.error || 'Delete failed');
        }
      })
      .catch(() => alert('Server error'));
    });
  
    // Helper: update time on drag/resize
    function patchEventTime(info) {
      fetch('/update_event_time/', {
        method:  'POST',
        headers: {
          'Content-Type':'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
          id:    info.event.id,
          start: info.event.start.toISOString(),
          end:   info.event.end ? info.event.end.toISOString() : null
        })
      })
      .then(r => r.json())
      .then(js => {
        if (!js.success) {
          alert('Time update failed');
          info.revert();
        }
      })
      .catch(() => {
        alert('Server error');
        info.revert();
      });
    }
  
    // Helper: format Date → "YYYY-MM-DDTHH:mm"
    function formatDate(d) {
      const dt = new Date(d.getTime() - d.getTimezoneOffset()*60000);
      return dt.toISOString().slice(0,16);
    }
  });