export const exportToICS = (events: any[]) => {
  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PSU Club//Samo Schedule//TH\nCALSCALE:GREGORIAN\n";

  events.forEach((event) => {
    const start = new Date(event.start_time).toISOString().replace(/-|:|\.\d+/g, "");
    const end = new Date(event.end_time).toISOString().replace(/-|:|\.\d+/g, "");
    
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `SUMMARY:${event.title}\n`;
    icsContent += `DESCRIPTION:${event.description || ""}\n`;
    icsContent += `DTSTART:${start}\n`;
    icsContent += `DTEND:${end}\n`;
    icsContent += `LOCATION:${event.location || ""}\n`;
    icsContent += "END:VEVENT\n";
  });

  icsContent += "END:VCALENDAR";

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "psu-events.ics");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};