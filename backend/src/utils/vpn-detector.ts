import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface VPNStatus {
  isConnected: boolean
  vpnName?: string
  connectionTime?: string
  error?: string
}

export class VPNDetector {
  private static instance: VPNDetector
  private lastCheck: Date | null = null
  private lastStatus: VPNStatus | null = null
  private cacheTimeout: number = 30000 // 30 segundos

  static getInstance(): VPNDetector {
    if (!VPNDetector.instance) {
      VPNDetector.instance = new VPNDetector()
    }
    return VPNDetector.instance
  }

  /**
   * Detecta se a VPN GlobalProtect está conectada
   */
  async detectGlobalProtect(): Promise<VPNStatus> {
    // Verificar cache
    if (this.lastCheck && this.lastStatus && 
        (Date.now() - this.lastCheck.getTime()) < this.cacheTimeout) {
      return this.lastStatus
    }

    try {
      console.log('🔍 Verificando status da VPN GlobalProtect...')

      // Método 1: Verificar processo GlobalProtect
      const processStatus = await this.checkGlobalProtectProcess()
      if (processStatus.isConnected) {
        this.updateCache(processStatus)
        return processStatus
      }

      // Método 2: Verificar interfaces de rede
      const interfaceStatus = await this.checkVPNInterface()
      if (interfaceStatus.isConnected) {
        this.updateCache(interfaceStatus)
        return interfaceStatus
      }

      // Método 3: Verificar conectividade com host VPN
      const connectivityStatus = await this.checkVPNConnectivity()
      this.updateCache(connectivityStatus)
      return connectivityStatus

    } catch (error) {
      const errorStatus: VPNStatus = {
        isConnected: false,
        error: `Erro ao detectar VPN: ${error}`
      }
      this.updateCache(errorStatus)
      return errorStatus
    }
  }

  /**
   * Verifica se o processo GlobalProtect está rodando
   */
  private async checkGlobalProtectProcess(): Promise<VPNStatus> {
    try {
      // Windows: verificar processo PanGPA.exe
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq PanGPA.exe" /FO CSV')
      
      if (stdout.includes('PanGPA.exe')) {
        console.log('✅ Processo GlobalProtect detectado')
        return {
          isConnected: true,
          vpnName: 'GlobalProtect',
          connectionTime: new Date().toISOString()
        }
      }

      return { isConnected: false }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar processo GlobalProtect:', error)
      return { isConnected: false }
    }
  }

  /**
   * Verifica interfaces de rede VPN
   */
  private async checkVPNInterface(): Promise<VPNStatus> {
    try {
      // Windows: verificar adaptadores de rede
      const { stdout } = await execAsync('ipconfig /all')
      
      // Procurar por adaptadores VPN comuns
      const vpnKeywords = [
        'GlobalProtect',
        'Palo Alto',
        'VPN',
        'TAP-Windows',
        'OpenVPN'
      ]

      for (const keyword of vpnKeywords) {
        if (stdout.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`✅ Interface VPN detectada: ${keyword}`)
          return {
            isConnected: true,
            vpnName: keyword,
            connectionTime: new Date().toISOString()
          }
        }
      }

      return { isConnected: false }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar interfaces VPN:', error)
      return { isConnected: false }
    }
  }

  /**
   * Testa conectividade com host VPN específico
   */
  private async checkVPNConnectivity(): Promise<VPNStatus> {
    try {
      const vpnHost = process.env.DB2_VPN_HOST
      if (!vpnHost) {
        return { isConnected: false, error: 'Host VPN não configurado' }
      }

      console.log(`🔍 Testando conectividade com ${vpnHost}...`)

      // Ping para o host VPN
      const { stdout } = await execAsync(`ping -n 1 -w 3000 ${vpnHost}`)
      
      if (stdout.includes('TTL=') || stdout.includes('time=')) {
        console.log('✅ Conectividade VPN confirmada via ping')
        return {
          isConnected: true,
          vpnName: 'VPN (via conectividade)',
          connectionTime: new Date().toISOString()
        }
      }

      return { isConnected: false, error: 'Host VPN não alcançável' }
    } catch (error) {
      console.warn('⚠️ Erro ao testar conectividade VPN:', error)
      return { isConnected: false, error: `Conectividade falhou: ${error}` }
    }
  }

  /**
   * Atualiza cache do status
   */
  private updateCache(status: VPNStatus): void {
    this.lastCheck = new Date()
    this.lastStatus = status
  }

  /**
   * Limpa cache forçando nova verificação
   */
  clearCache(): void {
    this.lastCheck = null
    this.lastStatus = null
  }

  /**
   * Monitora status da VPN continuamente
   */
  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    console.log(`🔄 Iniciando monitoramento VPN (intervalo: ${intervalMs}ms)`)
    
    setInterval(async () => {
      const status = await this.detectGlobalProtect()
      console.log(`📊 Status VPN: ${status.isConnected ? '✅ Conectada' : '❌ Desconectada'}`)
      
      if (!status.isConnected && status.error) {
        console.warn(`⚠️ ${status.error}`)
      }
    }, intervalMs)
  }
}
