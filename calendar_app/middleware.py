# myapp/middleware.py
class AllowIframeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Allow iframe embedding from same origin
        response['X-Frame-Options'] = 'SAMEORIGIN'
        return response
