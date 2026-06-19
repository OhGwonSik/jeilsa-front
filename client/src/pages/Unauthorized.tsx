import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/main');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            접근 권한 없음
          </CardTitle>
          <p className="text-gray-600 text-sm mt-2">
            이 페이지에 접근할 권한이 없습니다.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              요청하신 페이지에 접근하려면 적절한 권한이 필요합니다. 
              관리자에게 문의하거나 다른 페이지로 이동해주세요.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전 페이지
              </Button>
              
              {/*<Button*/}
              {/*  onClick={handleGoHome}*/}
              {/*  className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"*/}
              {/*>*/}
              {/*  <Home className="w-4 h-4 mr-2" />*/}
              {/*  메인으로*/}
              {/*</Button>*/}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}