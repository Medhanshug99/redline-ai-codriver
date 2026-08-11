import sys
import os
import subprocess
import time
import json

from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        network_responses = []
        def handle_response(response):
            if "/api/audio/upload" in response.url:
                try:
                    network_responses.append(response.json())
                except Exception as e:
                    print("Error parsing JSON:", e)
        page.on("response", handle_response)
        
        test_audio_path = os.path.join(os.path.dirname(__file__), "backend", "app", "data", "sample_audio", "clip_00.wav")
    
        if not os.path.exists(test_audio_path):
            print(f"Error: Could not find test audio file at {test_audio_path}")
        
        page.goto("http://localhost:5173")
        time.sleep(2)
        
        # Upload file
        print(f"Uploading file: {test_audio_path}...")
        page.set_input_files('input[type="file"]', test_audio_path)
        
        print("Waiting for API response (8s)...")
        time.sleep(8)
        
        # Let UI update
        time.sleep(2)
        
        print("Clicking interactive elements...")
        try:
            page.locator(".group.relative.cursor-pointer").first.hover(timeout=1000)
            time.sleep(0.5)
        except:
            pass
            
        print("\n=== NETWORK RESPONSE ===")
        print(json.dumps(network_responses, indent=2))
        
        print("\n=== CONSOLE LOGS ===")
        for log in console_logs:
            print(log)
            
        try:
            r_val = page.locator(".text-4xl.font-bold.font-mono").first.inner_text()
            print(f"\n=== PEARSON R VALUE ===\n{r_val}")
        except:
            pass

        browser.close()

if __name__ == "__main__":
    run_test()
