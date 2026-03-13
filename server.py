"""
Simple HTTP server with map saving API for Stacklands Map Editor.
Run with: python server.py
Then open: http://localhost:8080/map_editor.html
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

PORT = 8080
MAPS_DIR = "maps"

# Ensure maps directory exists
if not os.path.exists(MAPS_DIR):
    os.makedirs(MAPS_DIR)

class MapEditorHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with map saving endpoint."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add JSX MIME type for Babel standalone
        self.extensions_map['.jsx'] = 'text/javascript'

    def do_POST(self):
        """Handle POST requests for map saving."""
        parsed_path = urlparse(self.path)

        if parsed_path.path == '/api/maps/save':
            # Get map name from query params
            query_params = parse_qs(parsed_path.query)
            map_name = query_params.get('name', ['unnamed_map'])[0]

            # Sanitize map name
            map_name = ''.join(c if c.isalnum() or c == '_' else '_' for c in map_name)

            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                # Parse JSON data
                map_data = json.loads(post_data.decode('utf-8'))

                # Save to file
                file_path = os.path.join(MAPS_DIR, f"{map_name}.json")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(map_data, f, indent=2, ensure_ascii=False)

                # Update index.json
                index_path = os.path.join(MAPS_DIR, "index.json")
                index_data = {"maps": []}

                if os.path.exists(index_path):
                    with open(index_path, 'r', encoding='utf-8') as f:
                        index_data = json.load(f)

                if map_name not in index_data.get("maps", []):
                    index_data.setdefault("maps", []).append(map_name)

                with open(index_path, 'w', encoding='utf-8') as f:
                    json.dump(index_data, f, indent=2)

                # Send success response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                response = {"success": True, "file": file_path}
                self.wfile.write(json.dumps(response).encode('utf-8'))

                print(f"Saved map: {file_path}")

            except json.JSONDecodeError as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {"success": False, "error": f"Invalid JSON: {str(e)}"}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {"success": False, "error": str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))

        else:
            # For other POST requests, return 404
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests."""
        # Add CORS headers to all responses
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        # Continue with default GET handling
        return super().do_GET()

if __name__ == "__main__":
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    with socketserver.TCPServer(("", PORT), MapEditorHandler) as httpd:
        print(f"Map Editor Server running at http://localhost:{PORT}")
        print(f"Open http://localhost:{PORT}/map_editor.html to edit maps")
        print(f"Maps will be saved to the '{MAPS_DIR}' folder")
        print(f"Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
