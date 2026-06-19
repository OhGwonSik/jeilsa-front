// Navigation Guard 데모 컴포넌트
import React from 'react';
import { Users, Shield, Settings, FileText, Key } from 'lucide-react';

export function NavigationDemo() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🛡️ Navigation Guard 데모
        </h2>
        <p className="text-gray-600 mb-6">
          아래 링크들은 모두 NavigationGuard로 보호됩니다. 
          클릭 시 인증 상태와 권한을 자동으로 체크합니다.
        </p>
      </div>

      {/* 1. 일반 보호된 링크들 */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          📎 보호된 링크 (ProtectedLink)
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/user" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            사용자 관리 페이지
          </Link>
          
          <Link
            to="/role" 
            className="text-green-600 hover:text-green-800 underline"
          >
            역할 관리 페이지
          </Link>
          
          <Link
            to="/organization" 
            className="text-purple-600 hover:text-purple-800 underline"
          >
            조직 관리 페이지
          </Link>
          
          <Link
            to="/admin-only-page" 
            className="text-red-600 hover:text-red-800 underline"
          >
            관리자 전용 페이지 (권한 없음)
          </Link>
        </div>
      </section>

      {/* 2. 메뉴 아이템 형태 */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          📋 보호된 메뉴 아이템 (ProtectedMenuItem)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/user"
            icon={<Users className="w-5 h-5" />}
            label="사용자 관리"
            description="사용자 정보 및 계정 관리"
            showAccessStatus={true}
          />
          
          <Link
            to="/role"
            icon={<Shield className="w-5 h-5" />}
            label="역할 관리"
            description="권한 역할 설정 및 관리"
            showAccessStatus={true}
          />
          
          <Link
            to="/organization"
            icon={<FileText className="w-5 h-5" />}
            label="조직 관리"
            description="조직 구조 및 매핑 관리"
            showAccessStatus={true}
          />
          
          <Link
            to="/test/admin"
            icon={<Key className="w-5 h-5" />}
            label="관리자 테스트"
            description="관리자 전용 기능 테스트"
            showAccessStatus={true}
          />
          
          <Link
            to="/menu"
            icon={<Settings className="w-5 h-5" />}
            label="메뉴 관리"
            description="메뉴 구조 및 권한 설정"
            showAccessStatus={true}
          />
        </div>
      </section>

      {/* 3. 버튼 형태 */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          🔘 보호된 네비게이션 버튼 (ProtectedNavButton)
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link to="/user" variant="primary" size="md">
            사용자 페이지로 이동
          </Link>
          
          <Link to="/role" variant="secondary" size="md">
            역할 페이지로 이동
          </Link>
          
          <Link to="/organization" variant="outline" size="md">
            조직 페이지로 이동
          </Link>
          
          <Link to="/admin-only-page" variant="primary" size="sm">
            권한 없는 페이지 (비활성화됨)
          </Link>
        </div>
      </section>

      {/* 4. 일반 A 태그 (자동으로 가로채짐) */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          🔗 일반 A 태그 (자동 가로채기)
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm mb-3">
            아래 일반 A 태그들도 NavigationGuard가 자동으로 가로채서 인증을 체크합니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="/user" className="text-blue-600 hover:text-blue-800 underline">
              일반 A 태그로 사용자 페이지
            </a>
            <a href="/role" className="text-green-600 hover:text-green-800 underline">
              일반 A 태그로 역할 페이지
            </a>
            <a href="/admin-only-page" className="text-red-600 hover:text-red-800 underline">
              권한 없는 페이지 (자동 차단)
            </a>
          </div>
        </div>
      </section>

      {/* 5. 테스트 안내 */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          🧪 테스트 방법
        </h3>
        <div className="text-blue-800 space-y-2 text-sm">
          <p><strong>1. 로그인 상태에서:</strong> 권한이 있는 페이지는 이동, 없는 페이지는 차단</p>
          <p><strong>2. 로그아웃 상태에서:</strong> 모든 보호된 페이지가 로그인 페이지로 리다이렉트</p>
          <p><strong>3. 브라우저 콘솔:</strong> NavigationGuard의 상세한 로그 확인 가능</p>
          <p><strong>4. 직접 URL 입력:</strong> 주소창에 직접 입력해도 자동으로 가로채기</p>
        </div>
      </section>
    </div>
  );
}

export default NavigationDemo;