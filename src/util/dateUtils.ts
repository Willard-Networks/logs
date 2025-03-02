/**
 * Utility functions for date operations
 */

/**
 * Get the name of a month from its number (1-12)
 * @param month Month number (1-12)
 * @returns Month name abbreviation (Jan, Feb, etc.)
 */
export function getMonthName(month: number): string {
    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return monthNames[month - 1];
}

/**
 * Interface for month option objects
 */
export interface MonthOption {
    month: number;
    year: number;
    label: string;
}

/**
 * Get available months for statistics selection (last n months)
 * @param monthCount Number of months to include
 * @returns Array of month options
 */
export function getAvailableMonths(monthCount: number = 3): MonthOption[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const availableMonths: MonthOption[] = [];
    
    for (let i = 0; i < monthCount; i++) {
        let monthIndex = currentMonth - i;
        let yearValue = currentYear;
        
        if (monthIndex < 0) {
            monthIndex += 12;
            yearValue -= 1;
        }
        
        availableMonths.push({
            month: monthIndex + 1, // Convert to 1-based month
            year: yearValue,
            label: `${getMonthName(monthIndex + 1)} ${yearValue}`
        });
    }
    
    return availableMonths;
}

/**
 * Format date strings for MySQL queries
 * @param month Month (1-12)
 * @param year Year (e.g., 2024)
 * @returns Object with startDate and endDate formatted for MySQL
 */
export function getMonthDateRange(month: number, year: number): { startDate: string, endDate: string } {
    const startDate = `${getMonthName(month)} 1 ${year} 1:00AM`;
    
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${getMonthName(nextMonth)} 1 ${nextYear} 1:00AM`;
    
    return { startDate, endDate };
} 