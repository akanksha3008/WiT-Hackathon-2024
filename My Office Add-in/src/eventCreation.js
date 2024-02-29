
import { updateState, getState } from './taskpane/taskpane.js';
import {handlenewsletter, moveMail} from './moveInFolder.js';

function getDateNWorkingDaysBack(date, n) {
  const workingDaysCount = [];
  let currentDate = new Date(date);
  
  while (workingDaysCount.length < n) {
    // Move the date back by one day
    currentDate.setDate(currentDate.getDate() - 1);
    
    // Check if the current date is a working day (Monday to Friday)
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      workingDaysCount.push(new Date(currentDate));
    }
  }
  
  // Return the nth working day back
  return workingDaysCount[n - 1];
}

async function handleToDos(accessToken, todoResponse){
        let tableRows = '';
        var registrationMail = [];
        var currentDate = new Date();
        todoResponse.forEach(function(obj) {
            const givenDate = new Date(obj['due-date']);
            var twoDaysBeforeDate = new Date(obj['due-date']);
            var twoWorkingDaysBack = getDateNWorkingDaysBack(twoDaysBeforeDate, 2);
            twoDaysBeforeDate.setDate(givenDate.getDate() - 2);

            if(obj['predicted-category']==='Registration'){
                const state = getState();
                // updateState({registration:state.registration+1});
                 const tableData = `<td>${obj['subject']}</td>`; // Assuming each item is a string
                tableRows += `<tr>${tableData}</tr>`;
                registrationMail.push(obj);
            }
            else if(obj['predicted-category']==='To-do'){
                if (twoWorkingDaysBack.getTime() > currentDate.getTime()) {
                                console.log('The date 2 days before is in the future.');
                                twoWorkingDaysBack.setHours(16,0,0,0);
                                var event = {
                                        subject: obj['subject'],
                                        content: obj['content'],
                                        id:obj['id'],
                                        date: twoWorkingDaysBack.getTime()
                                };
                                    createReminder(event, accessToken);
                } else if (twoWorkingDaysBack.getTime() < currentDate.getTime()) {
                                console.log('The date 2 days before is in the past.');
                                currentDate.setHours(16,0,0,0);
                                    var event = {
                                        subject: obj['subject'],
                                        content: obj['content'],
                                        id:obj['id'],
                                        date: currentDate.getTime()
                                    };
                                createReminder(event, accessToken);
                } else {
                                console.log('The date 2 days before is the same as the current date.');
                }
            }
            
          }); 
        if(tableRows !== ''){
            const tableHTML = `<table border="1">${tableRows}</table>`;
            var event = {
                            subject: "Today's Registrations!",
                            content: tableHTML,
                            date: currentDate.setHours(17,0,0,0)
                        };
            createReminder(event, accessToken);
            handlenewsletter(accessToken,registrationMail,"Registrations");
        }
  }

async function createReminder(calendarData,accessToken){
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = new Date(calendarData.date);
  date.setTime(date.getTime() + (15 * 60 * 1000)); // Add 15 minutes in milliseconds
  var contentType='';
  if(calendarData.subject ==="Today's Registrations!")
    contentType = 'html';
  else
    contentType='text';
  const event = {
        subject: 'Reminder: '+calendarData.subject,
        start: {
            dateTime:  new Date(calendarData.date), 
            timeZone: timeZone, 
        },
        end: {
            dateTime: date,
            timeZone: timeZone, 
        },
        reminderMinutesBeforeStart: 15,
        body: {
                contentType: contentType,
                content: `Email content:\n${calendarData.content}` // Include email content in the description
            }
    };
    console.log("Event object: ");
    console.log(event);
    const queryParams = new URLSearchParams({
            startDateTime: new Date(calendarData.date).toISOString(),
            endDateTime: new Date(calendarData.date).toISOString(),
        });
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });

    if (!response.ok) {
        throw new Error('Failed to retrieve events from the calendar.');
    }
    const events = await response.json();
    const existingEvent = events.value.find(e => e.subject === event.subject);

    if (!existingEvent) {
      try {
          const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(event),
          });

          if (response.ok) {
            const state = getState();
            console.log("Updating state object for increasing calendarItem stat from "+state.calendarItem +" to "+(state.calendarItem+1));
            
            updateState({calendarItem:state.calendarItem+1});
              console.log('Reminder created successfully.');
          } else {
              console.error('Failed to create reminder:', response.statusText);
          }
      } catch (error) {
          console.error('Error creating reminder:', error);
      }
  }
};

export {handleToDos, createReminder};