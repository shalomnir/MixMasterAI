"""
Race Condition Test Script for Cocktail Machine
Tests concurrent pour requests to find race conditions
"""
import requests
import time
from concurrent.futures import ThreadPoolExecutor

def test_concurrent_pours(num_requests=3):
    """Test concurrent pour requests"""
    def pour_request(request_id):
        try:
            session = requests.Session()
            # Simulate different users
            session.cookies.set('user_id', str(request_id + 1))
            
            start_time = time.time()
            response = session.post(
                'http://localhost:5000/pour/1',
                json={'is_strong': False},
                timeout=10
            )
            end_time = time.time()
            
            return {
                'request_id': request_id,
                'status_code': response.status_code,
                'response': response.json() if response.ok else response.text,
                'duration': end_time - start_time
            }
        except Exception as e:
            return {
                'request_id': request_id,
                'error': str(e)
            }
    
    print(f"\n{'='*60}")
    print(f"Testing {num_requests} concurrent pour requests...")
    print(f"{'='*60}\n")
    
    start = time.time()
    
    # Execute requests concurrently
    with ThreadPoolExecutor(max_workers=num_requests) as executor:
        results = list(executor.map(pour_request, range(num_requests)))
    
    total_time = time.time() - start
    
    # Analyze results
    successes = [r for r in results if r.get('status_code') == 200]
    errors = [r for r in results if r.get('status_code') == 400]
    exceptions = [r for r in results if 'error' in r]
    
    print("Results:")
    print(f"  Total requests: {num_requests}")
    print(f"  Successes (200): {len(successes)} {'❌ RACE CONDITION!' if len(successes) > 1 else '✅'}")
    print(f"  Busy errors (400): {len(errors)}")
    print(f"  Exceptions: {len(exceptions)}")
    print(f"  Total time: {total_time:.2f}s\n")
    
    for result in results:
        print(f"Request #{result['request_id']}:")
        if 'error' in result:
            print(f"  ❌ Exception: {result['error']}")
        else:
            status_emoji = '✅' if result['status_code'] == 200 else '⚠️'
            print(f"  {status_emoji} Status: {result['status_code']}")
            print(f"  Response: {result.get('response')}")
            print(f"  Duration: {result.get('duration', 0):.2f}s")
        print()
    
    # Verdict
    if len(successes) > 1:
        print("🚨 CRITICAL: Race condition detected! Multiple requests succeeded.")
        print("   This means multiple drinks are being poured simultaneously!")
    elif len(successes) == 1:
        print("✅ PASS: Only one request succeeded. Locking mechanism works.")
    else:
        print("⚠️  WARNING: No requests succeeded. Check if the app is running.")
    
    return results

if __name__ == "__main__":
    # Test 1: 3 concurrent requests
    print("\n🧪 TEST 1: Three Concurrent Requests")
    test_concurrent_pours(3)
    
    # Wait for machine to reset
    time.sleep(2)
    
    # Test 2: 5 concurrent requests (stress test)
    print("\n🧪 TEST 2: Five Concurrent Requests (Stress Test)")
    test_concurrent_pours(5)
    
    # Test 3: Sequential requests (control)
    print("\n🧪 TEST 3: Sequential Requests (Control)")
    print("='*60")
    for i in range(3):
        session = requests.Session()
        session.cookies.set('user_id', str(i + 1))
        try:
            r = session.post('http://localhost:5000/pour/1', json={'is_strong': False})
            print(f"Request {i}: {r.status_code} - {r.json()}")
        except Exception as e:
            print(f"Request {i}: Error - {e}")
        time.sleep(3)  # Wait for pour to complete
