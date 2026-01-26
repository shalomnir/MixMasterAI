"""
Security and Edge Case Testing Suite
Tests various vulnerabilities and edge cases
"""
import requests
import json
from time import sleep

BASE_URL = "http://localhost:5000"

def test_xss_injection():
    """Test XSS vulnerability in nickname field"""
    print("\n🔍 TEST: XSS Injection in Nickname")
    print("="*60)
    
    payloads = [
        "<script>alert('XSS')</script>",
        "';alert(String.fromCharCode(88,83,83))//",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')"
    ]
    
    for payload in payloads:
        try:
            r = requests.post(
                f"{BASE_URL}/",
                data={'nickname': payload},
                allow_redirects=False
            )
            print(f"Payload: {payload[:50]}")
            print(f"  Status: {r.status_code}")
            print(f"  Accepted: {'✅ Yes (❌ VULNERABLE!)' if r.status_code == 302 else '❌ No'}\n")
        except Exception as e:
            print(f"  Error: {e}\n")


def test_nickname_edge_cases():
    """Test edge cases for nickname input"""
    print("\n🔍 TEST: Nickname Edge Cases")
    print("="*60)
    
    test_cases = {
        "Empty string": "",
        "Whitespace only": "   ",
        "Very long (500 chars)": "A" * 500,
        "Special characters": "!@#$%^&*()",
        "SQL injection": "' OR '1'='1",
        "Unicode emoji": "💩💩💩",
        "Null byte": "admin\x00hidden",
        "HTML tags": "<b>Bold</b>",
    }
    
    for name, value in test_cases.items():
        try:
            r = requests.post(
                f"{BASE_URL}/",
                data={'nickname': value},
                allow_redirects=False
            )
            accepted = r.status_code == 302
            print(f"{name}:")
            print(f"  Value: {repr(value[:50])}")
            print(f"  Accepted: {'✅ Yes' if accepted else '❌ Rejected'}")
            if accepted:
                print(f"  ⚠️  Potential vulnerability!")
            print()
        except Exception as e:
            print(f"{name}: Error - {e}\n")


def test_admin_access_without_auth():
    """Test unauthorized admin access"""
    print("\n🔍 TEST: Unauthorized Admin Access")
    print("="*60)
    
    # Test without any authentication
    try:
        r = requests.get(f"{BASE_URL}/admin-dashboard")
        print(f"GET /admin-dashboard (no auth):")
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            print(f"  ❌ CRITICAL: Admin panel accessible without authentication!")
        else:
            print(f"  ✅ Protected")
        print()
    except Exception as e:
        print(f"Error: {e}\n")


def test_negative_values():
    """Test negative and invalid numeric inputs"""
    print("\n🔍 TEST: Negative Values & Overflow")
    print("="*60)
    
    session = requests.Session()
    session.post(f"{BASE_URL}/", data={'nickname': 'QA_Tester'})
    
    # Note: This would require accessing admin panel
    # Testing via direct API if available
    test_values = [
        -1,
        -999999,
        0,
        float('inf'),
        999999999999999,
    ]
    
    print("Testing recipe creation with invalid durations:")
    for val in test_values:
        print(f"  Value: {val} - {type(val).__name__}")
    print("  ⚠️  Manual testing required for admin panel\n")


def test_account_takeover():
    """Test account takeover vulnerability"""
    print("\n🔍 TEST: Account Takeover via Nickname Guessing")
    print("="*60)
    
    # Create first user
    session1 = requests.Session()
    r1 = session1.post(f"{BASE_URL}/", data={'nickname': 'VictimUser'})
    print("Step 1: Created user 'VictimUser'")
    print(f"  Cookies: {session1.cookies.get_dict()}")
    
    # Try to login as the same user from different session
    session2 = requests.Session()
    r2 = session2.post(f"{BASE_URL}/", data={'nickname': 'VictimUser'})
    print("\nStep 2: Attempted login as 'VictimUser' from different session")
    print(f"  Cookies: {session2.cookies.get_dict()}")
    
    if session2.cookies.get('user_id'):
        print(f"\n  ❌ CRITICAL: Account takeover possible!")
        print(f"  Different sessions can login as the same user!")
    else:
        print(f"\n  ✅ Protected")


def test_cookie_manipulation():
    """Test cookie manipulation"""
    print("\n🔍 TEST: Cookie Manipulation")
    print("="*60)
    
    session = requests.Session()
    
    # Try sequential user IDs
    test_ids = [1, 2, 3, 999, -1, 'abc', '', None]
    
    for user_id in test_ids:
        session.cookies.clear()
        session.cookies.set('user_id', str(user_id))
        
        try:
            r = session.get(f"{BASE_URL}/menu")
            print(f"Cookie user_id={user_id}:")
            print(f"  Access: {'✅ Granted' if r.status_code == 200 else '❌ Denied'}")
            if r.status_code == 200:
                print(f"  ⚠️  Can access menu with manipulated cookie!")
        except Exception as e:
            print(f"  Error: {e}")
        print()


def test_concurrent_point_updates():
    """Test if concurrent requests can cause point duplication"""
    print("\n🔍 TEST: Concurrent Point Updates (Bonus Points)")
    print("="*60)
    print("This test would verify if race conditions allow earning points multiple times")
    print("Requires fixing the primary bug first\n")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🛡️  SECURITY & EDGE CASE TEST SUITE")
    print("="*60)
    
    try:
        # Verify app is running
        r = requests.get(BASE_URL, timeout=2)
        print(f"✅ App is running at {BASE_URL}\n")
    except:
        print(f"❌ ERROR: App not running at {BASE_URL}")
        print("Please start the Flask app first: python app.py")
        exit(1)
    
    # Run all tests
    test_nickname_edge_cases()
    test_xss_injection()
    test_admin_access_without_auth()
    test_account_takeover()
    test_cookie_manipulation()
    test_negative_values()
    test_concurrent_point_updates()
    
    print("\n" + "="*60)
    print("✅ Test suite completed")
    print("="*60 + "\n")
