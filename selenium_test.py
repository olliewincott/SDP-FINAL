from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import traceback

# --- CONFIGURATION ---
USERNAME = "Oliver_Wincott"
PASSWORD = "Hazel69mc"
BASE_URL = "http://127.0.0.1:8000/"

# --- SETUP ---
driver = webdriver.Chrome()

try:
    driver.get(BASE_URL)

    # --- LOGIN ---
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.XPATH, "//button[text()='Login']"))
    ).click()

    WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((By.ID, "login-username"))
    )

    driver.find_element(By.ID, "login-username").send_keys(USERNAME)
    driver.find_element(By.ID, "login-password").send_keys(PASSWORD, Keys.RETURN)

    WebDriverWait(driver, 15).until(
        EC.url_contains("/dashboard")
    )
    print("✅ Login successful and dashboard loaded.")

    time.sleep(2)
    driver.save_screenshot("selenium_dashboard_after_login.png")

    # --- GO TO TASKS PAGE ---
    driver.get(BASE_URL + "tasks/")
    WebDriverWait(driver, 15).until(
        EC.url_contains("/tasks")
    )
    print("✅ Tasks page loaded.")

    time.sleep(2)
    driver.save_screenshot("selenium_tasks_page_loaded.png")

    # --- OPEN ADD TASK MODAL ---
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-action='add-task']"))
    ).click()

    # Give modal time to open fully
    time.sleep(2)

    # Now wait until modal is visible
    WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((By.ID, "addTaskModal"))
    )
    WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((By.ID, "task-title"))
    )

    # --- FILL IN NEW TASK ---
    new_task_title = "Selenium Test Task"
    driver.find_element(By.ID, "task-title").send_keys(new_task_title)
    driver.find_element(By.ID, "task-description").send_keys("Task created automatically via Selenium.")

    # Click due date picker
    due_date_input = driver.find_element(By.ID, "task-due-date")
    due_date_input.click()
    time.sleep(1)  # Tiny wait for calendar popup
    due_date_input.send_keys(Keys.ARROW_RIGHT)
    due_date_input.send_keys(Keys.RETURN)

    # --- SUBMIT THE TASK FORM ---
    driver.find_element(By.ID, "saveTaskBtn").click()

    # --- VERIFY TASK APPEARS ---
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{new_task_title}')]"))
    )
    print("✅ New task successfully added and displayed!")

    time.sleep(2)
    driver.save_screenshot("selenium_task_created.png")

except Exception as e:
    print("❌ Test failed with exception:")
    traceback.print_exc()

finally:
    driver.quit()