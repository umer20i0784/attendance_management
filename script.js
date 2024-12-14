document.addEventListener("DOMContentLoaded", async function () {

    const adminPassword = "admin";
    
    const employees = {
        "elisabeth": "Elisabeth Salas",
        "candy": "Candy Ramirez",
        "leslie": "Leslie Mejia",
        "Mc": "Maricarmen",
    };

    const apiKey = "2258afe784f342a1aa158d830867dd36"; //  API Key for ipgeolocation.io
    // Initialize Supabase
    const supabaseUrl = "https://vtxfzozljisqzeesakof.supabase.co"; 
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eGZ6b3psamlzcXplZXNha29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MjQ3NTksImV4cCI6MjA0ODIwMDc1OX0.BhoyDDx86sU-wwNUv8gWtzRr-4k7N4p4w4k04utHfec"; 
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    let currentAction = "";

    // Admin Actions: Generate Report
    document.getElementById("generate-report-btn").addEventListener("click", async function () {
        const enteredPassword = document.getElementById("admin-password").value;
        if (enteredPassword !== adminPassword) {
            alert("Incorrect password.");
            return;
        }

        // Fetch Data from Supabase
        const { data, error } = await supabase.from("clock_actions").select("*");
        if (error) {
            console.error("Error fetching data from Supabase:", error);
            alert("Failed to fetch data.");
            return;
        }

        // Process Data for Excel
        const reportData = processReportData(data);

        // Generate and Download Excel
        generateExcelReport(reportData);
    });

    function processReportData(data) {
        const report = {
            weeklyHours: 0, // Cumulative hours for the current week
            todayHours: 0, // Cumulative hours for today
            todayLogs: [], // Detailed logs for today
            weeklyLogs: {}, // Logs for the week grouped by employees
        };
    
        const todayDate = new Date().toISOString().split("T")[0]; // Today's date (YYYY-MM-DD)
        const currentWeekStart = getStartOfCurrentWeek(); // Start of the current week (YYYY-MM-DD)
    
        data.forEach((entry) => {
            const { employee, action, timestamp, ip, city, region, country, latitude, longitude } = entry;
    
            const logDate = new Date(timestamp).toISOString().split("T")[0]; // Entry date (YYYY-MM-DD)
    
            // Check if entry belongs to the current week
            if (logDate >= currentWeekStart) {
                if (!report.weeklyLogs[employee]) {
                    report.weeklyLogs[employee] = { dailyHours: {}, totalHours: 0, logs: [] };
                }
    
                if (!report.weeklyLogs[employee].dailyHours[logDate]) {
                    report.weeklyLogs[employee].dailyHours[logDate] = 0; // Initialize daily hours for this date
                }
    
                report.weeklyLogs[employee].logs.push({ action, timestamp, ip, location: `${city}, ${region}, ${country}`, latitude, longitude });
    
                // Calculate hours worked if we have both Clock In and Clock Out
                if (action === "Clock Out") {
                    const lastLog = report.weeklyLogs[employee].logs[report.weeklyLogs[employee].logs.length - 2]; // Previous log
                    if (lastLog && lastLog.action === "Clock In") {
                        const inTime = new Date(lastLog.timestamp);
                        const outTime = new Date(timestamp);
                        const hoursWorked = (outTime - inTime) / (1000 * 60 * 60); // Calculate hours
    
                        // Add to daily and cumulative hours
                        report.weeklyLogs[employee].dailyHours[logDate] += hoursWorked;
                        report.weeklyLogs[employee].totalHours += hoursWorked;
    
                        // Add to weekly cumulative hours
                        report.weeklyHours += hoursWorked;
    
                        // If it's today, add to today's hours and logs
                        if (logDate === todayDate) {
                            report.todayHours += hoursWorked;
                            report.todayLogs.push({ employee, action, timestamp, ip, city, region, country, latitude, longitude });
                        }
                    }
                }
            }
        });
    
        return report;
    }
    
    // Helper Function: Get the start date of the current week
    function getStartOfCurrentWeek() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // Sunday is 0, Monday is 1, and so on
        const difference = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust if it's Sunday
        const weekStart = new Date(now.setDate(difference));
        return weekStart.toISOString().split("T")[0]; // Return YYYY-MM-DD format
    }
    

    // Generate Excel Report
    function generateExcelReport(report) {
        const rows = [["Employee", "Date", "Action", "Timestamp", "IP Address", "Location", "Latitude", "Longitude", "Daily Hours", "Total Weekly Hours"]];
    
        // Process weekly logs
        Object.keys(report.weeklyLogs).forEach((employee) => {
            const employeeLogs = report.weeklyLogs[employee];
    
            // Add daily hours for each date
            Object.keys(employeeLogs.dailyHours).forEach((date) => {
                rows.push([employee, date, "", "", "", "", "", "", employeeLogs.dailyHours[date], ""]);
            });
    
            // Add detailed logs
            employeeLogs.logs.forEach((log) => {
                rows.push([employee, "", log.action, log.timestamp, log.ip, log.location, log.latitude, log.longitude, "", employeeLogs.totalHours]);
            });
        });
    
        // Add a summary row
        rows.push(["Summary", "", "", "", "", "", "", "", `Today's Hours: ${report.todayHours}`, `Weekly Hours: ${report.weeklyHours}`]);
    
        // Create Workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Report");
    
        // Download Excel
        XLSX.writeFile(wb, "Employee_Report.xlsx");
    }
    

    // Display current time
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById("current-time").innerText = `Current Time: ${timeString}`;
    }

    setInterval(updateTime, 1000); // Update every second



    // Fetch and display current IP address and location
    async function getIpLocation() {
        try {
            const response = await fetch("https://api.ipgeolocation.io/ipgeo?apiKey=2258afe784f342a1aa158d830867dd36");
            const data = await response.json();
            document.getElementById("current-ip").innerText = `Current IP: ${data.ip}`;
            return {
                ip: data.ip,
                city: data.city,
                region: data.state_prov,
                country: data.country_name,
                latitude: data.latitude,
                longitude: data.longitude,
            };
        } catch (error) {
            console.error("Error fetching IP location:", error);
            return null;
        }
    }

    const myip = await getIpLocation(); // Fetch IP on load

    // Listen for modal triggers
    document.querySelectorAll('[data-bs-target="#clockModal"]').forEach((button) => {
        button.addEventListener("click", function () {
            currentAction = this.getAttribute("data-action"); // Store the action
        });
    });
    

    // Handle modal confirm button
    document.getElementById("confirm-btn").addEventListener("click", async function () {
        const secretKey = document.getElementById("secret-key").value;
        if (!secretKey) {
            alert("Please enter a secret key.");
            return;
        }

        const employeeName = employees[secretKey];
        if (employeeName) {
            // Fetch location data
            const location = await getIpLocation();
            if (location) {
                logAction(employeeName, currentAction, location);
            } else {
                alert("Failed to fetch location data.");
            }

            // Close the modal
            const clockModal = document.getElementById("clockModal");
            const modalInstance = bootstrap.Modal.getInstance(clockModal);
            modalInstance.hide();
        } else {
            alert("Invalid secret key.");
        }

        document.getElementById("secret-key").value = ""; // Clear input field
    });

    // Log action
    async function logAction(employeeName, action, location) {
        const payload = {
            employee: employeeName,
            action: action,
            timestamp: new Date().toISOString(),
            ip: location.ip,
            city: location.city,
            region: location.region,
            country: location.country,
            latitude: location.latitude,
            longitude: location.longitude,
        };

        try {
            const { data, error } = await supabase.from("clock_actions").insert([payload]);
            if (error) {
                console.error("Error saving data to Supabase:", error);
                alert("Failed to log action. Please try again.");
            } else {
                console.log("Data saved to Supabase:", data);
                alert(`${employeeName} has successfully ${action.toLowerCase()}ed.`);
            }
        } catch (error) {
            console.error("Unexpected error:", error);
        }
        
    }
});

